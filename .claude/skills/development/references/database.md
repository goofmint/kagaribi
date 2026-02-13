# Database Reference - Kagaribi

Comprehensive reference for database usage in Kagaribi projects with Drizzle ORM.

## Supported Field Types

When using `kagaribi model new`, the following field types are supported:

### String Types

| Type | PostgreSQL | MySQL | Description | Example |
|------|------------|-------|-------------|---------|
| `string` | `text` | `varchar(255)` | Variable-length string | `name:string` |
| `text` | `text` | `text` | Long text content | `content:text` |
| `uuid` | `uuid` | `char(36)` | UUID identifier | `id:uuid` |

### Numeric Types

| Type | PostgreSQL | MySQL | Description | Example |
|------|------------|-------|-------------|---------|
| `integer` | `integer` | `int` | 32-bit integer | `age:integer` |
| `bigint` | `bigint` | `bigint` | 64-bit integer | `views:bigint` |

### Boolean Type

| Type | PostgreSQL | MySQL | Description | Example |
|------|------------|-------|-------------|---------|
| `boolean` | `boolean` | `boolean` | True/false value | `is_active:boolean` |

### Date/Time Types

| Type | PostgreSQL | MySQL | Description | Example |
|------|------------|-------|-------------|---------|
| `timestamp` | `timestamp` | `timestamp` | Date and time | `created_at:timestamp` |
| `date` | `date` | `date` | Date only | `birth_date:date` |

### JSON Type

| Type | PostgreSQL | MySQL | Description | Example |
|------|------------|-------|-------------|---------|
| `json` | `jsonb` | `json` | JSON data | `metadata:json` |

## Model Generation Command

```bash
kagaribi model new <table> <field:type>... [--db postgresql|mysql]
```

**Examples:**

```bash
# User model with various field types
kagaribi model new users \
  name:string \
  email:string \
  age:integer \
  is_active:boolean

# Blog post with text content
kagaribi model new posts \
  title:string \
  content:text \
  author_id:integer \
  published_at:timestamp

# Product with JSON metadata
kagaribi model new products \
  name:string \
  price:integer \
  metadata:json \
  sku:uuid
```

**Auto-generated fields:**
- `id` - Serial primary key (auto-increment)
- `createdAt` - Timestamp with default now()

## Schema File Location and Conventions

### File: `db/schema.ts`

All table definitions live in this single file.

**Conventions:**
- Use `camelCase` for table variable names: `export const userProfiles`
- Use `snake_case` for table names in database: `pgTable('user_profiles', ...)`
- Use `camelCase` for TypeScript field names: `firstName`
- Use `snake_case` for database column names: `first_name`

**Example schema:**

```typescript
import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Posts table with foreign key
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Comments table with multiple foreign keys
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  body: text('body').notNull(),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Model Helper Usage Patterns

Model helpers are auto-generated in `db/models/<table>.ts` when you run
`kagaribi model new`.

### Standard Helper Functions

#### `findAll<Model>()`

Retrieve all records from a table.

```typescript
import { findAllPosts } from '../../../db/models/posts.js';

// In your route handler
app.get('/api/posts', async (c) => {
  const posts = await findAllPosts();
  return c.json(posts);
});
```

#### `findById<Model>(id: number)`

Retrieve a single record by ID.

```typescript
import { findPostById } from '../../../db/models/posts.js';

app.get('/api/posts/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const post = await findPostById(id);

  if (!post) {
    return c.json({ error: 'Post not found' }, 404);
  }

  return c.json(post);
});
```

#### `create<Model>(data: CreateData)`

Create a new record.

```typescript
import { createPost } from '../../../db/models/posts.js';

app.post('/api/posts', async (c) => {
  const { title, content } = await c.req.json();

  const post = await createPost({
    title,
    content,
    authorId: 1, // Assuming authenticated user
  });

  return c.json(post, 201);
});
```

#### `update<Model>(id: number, data: Partial<UpdateData>)`

Update an existing record.

```typescript
import { updatePost } from '../../../db/models/posts.js';

app.put('/api/posts/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const post = await updatePost(id, data);

  if (!post) {
    return c.json({ error: 'Post not found' }, 404);
  }

  return c.json(post);
});
```

#### `remove<Model>(id: number)`

Delete a record.

```typescript
import { removePost } from '../../../db/models/posts.js';

app.delete('/api/posts/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  await removePost(id);

  return c.json({ success: true });
});
```

### Custom Queries

For queries not covered by helpers, use `getDb()` and Drizzle query builder:

```typescript
import { getDb, schema } from '../../../db/index.js';
import { eq, and, or, gt, lt, desc, asc } from 'drizzle-orm';

const db = getDb();

// Filter by condition
const activePosts = await db
  .select()
  .from(schema.posts)
  .where(eq(schema.posts.published, true));

// Multiple conditions
const recentActivePosts = await db
  .select()
  .from(schema.posts)
  .where(
    and(
      eq(schema.posts.published, true),
      gt(schema.posts.createdAt, new Date('2024-01-01'))
    )
  );

// Sorting and pagination
const posts = await db
  .select()
  .from(schema.posts)
  .orderBy(desc(schema.posts.createdAt))
  .limit(10)
  .offset(0);

// Joins
const postsWithAuthors = await db
  .select({
    postId: schema.posts.id,
    title: schema.posts.title,
    authorName: schema.users.name,
    authorEmail: schema.users.email,
  })
  .from(schema.posts)
  .leftJoin(schema.users, eq(schema.posts.authorId, schema.users.id));
```

## Migration Workflow

### 1. Make Schema Changes

Edit `db/schema.ts`:

```typescript
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').default(false),  // Added field
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 2. Generate Migration

```bash
pnpm run db:generate
```

This creates migration files in `drizzle/` directory:
- `drizzle/0001_add_published_field.sql` - SQL migration
- `drizzle/meta/0001_snapshot.json` - Metadata snapshot

### 3. Review Migration

Check the generated SQL:

```bash
cat drizzle/0001_add_published_field.sql
```

Example output:
```sql
ALTER TABLE "posts" ADD COLUMN "published" boolean DEFAULT false;
```

### 4. Apply Migration

```bash
pnpm run db:migrate
```

This executes all pending migrations against your database.

### 5. Verify

```bash
pnpm run db:studio
```

Opens Drizzle Studio to visually inspect your database.

## Drizzle Kit Commands

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Push schema directly to database (no migration files)
npx drizzle-kit push

# Apply pending migrations
npx drizzle-kit migrate

# Open Drizzle Studio (database GUI)
npx drizzle-kit studio

# Check migration status
npx drizzle-kit check

# Drop all tables (⚠️ dangerous)
npx drizzle-kit drop
```

## Database Connection Patterns

### Node.js with node-postgres

```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { createDbHelper } from '@kagaribi/core';
import * as schema from './schema.js';

const { initDb, getDb } = createDbHelper((url) => {
  return drizzle(url, { schema });
});

export { initDb, getDb, schema };
```

### Cloudflare Workers with Neon

```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { createDbHelper } from '@kagaribi/core';
import * as schema from './schema.js';

const { initDb, getDb } = createDbHelper((url) => {
  const sql = neon(url);
  return drizzle(sql, { schema });
});

export { initDb, getDb, schema };
```

### Using in Packages

```typescript
import { Hono } from 'hono';
import { createDbMiddleware } from '@kagaribi/core';
import { initDb, getDb, schema } from '../../../db/index.js';

const app = new Hono()
  // Initialize database from environment
  .use('*', createDbMiddleware({ initFn: initDb }))

  // Use database in routes
  .get('/api/users', async (c) => {
    const db = getDb();
    const users = await db.select().from(schema.users);
    return c.json(users);
  });
```

## Advanced Patterns

### Transactions

```typescript
import { getDb, schema } from '../../../db/index.js';

app.post('/api/users-with-post', async (c) => {
  const { userName, postTitle } = await c.req.json();
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    // Create user
    const [user] = await tx
      .insert(schema.users)
      .values({ name: userName })
      .returning();

    // Create post for user
    const [post] = await tx
      .insert(schema.posts)
      .values({ title: postTitle, authorId: user.id })
      .returning();

    return { user, post };
  });

  return c.json(result);
});
```

### Prepared Statements

```typescript
import { getDb, schema } from '../../../db/index.js';
import { eq } from 'drizzle-orm';

const db = getDb();

// Prepare statement once
const findUserById = db
  .select()
  .from(schema.users)
  .where(eq(schema.users.id, sql.placeholder('id')))
  .prepare('find_user_by_id');

// Execute multiple times efficiently
const user1 = await findUserById.execute({ id: 1 });
const user2 = await findUserById.execute({ id: 2 });
```

### Subqueries

```typescript
import { getDb, schema } from '../../../db/index.js';
import { sql } from 'drizzle-orm';

const db = getDb();

// Get users with post count
const usersWithPostCount = await db
  .select({
    id: schema.users.id,
    name: schema.users.name,
    postCount: sql<number>`(
      SELECT COUNT(*)
      FROM ${schema.posts}
      WHERE ${schema.posts.authorId} = ${schema.users.id}
    )`,
  })
  .from(schema.users);
```

## Best Practices

1. **Use model helpers for simple CRUD** - Faster development, consistent patterns
2. **Use direct queries for complex operations** - Joins, aggregations, subqueries
3. **Always use transactions for multi-step operations** - Ensures data consistency
4. **Index foreign keys** - Improves query performance
5. **Use prepared statements for repeated queries** - Better performance
6. **Keep schema.ts organized** - Group related tables, add comments
7. **Review generated migrations** - Ensure they match your intent
8. **Back up before migrations** - Especially in production

## Troubleshooting

**Issue:** Type errors with Drizzle queries
- **Solution:** Import correct operators from `drizzle-orm`

**Issue:** Migration fails with constraint violation
- **Solution:** Add data migration step before schema change

**Issue:** Slow queries
- **Solution:** Add indexes, check query plan with `EXPLAIN`

**Issue:** Connection pool exhausted
- **Solution:** Ensure database connections are properly managed, increase pool size

## Related Documentation

- Development workflow → `.claude/skills/development/SKILL.md`
- Configuration reference → `.claude/skills/development/references/configuration.md`
- PostgreSQL blog example → `examples/postgresql-blog/CLAUDE.md`
