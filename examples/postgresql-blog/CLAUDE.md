# PostgreSQL Blog Example - Claude Development Guide

This is a Kagaribi project demonstrating database integration with PostgreSQL,
Drizzle ORM, and model helpers for common database operations.

## Project Overview

A blog application with:
- **posts** package - CRUD operations for blog posts
- **PostgreSQL** database - Persistent storage with Drizzle ORM
- **Model helpers** - Generated helper functions for database queries

## Database Schema

Location: `db/schema.ts`

### Tables

**posts**
```typescript
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**users**
```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  age: integer('age').notNull(),
  is_active: boolean('is_active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Model Helpers

Location: `db/models/`

Model helpers are auto-generated with `kagaribi model new` and provide common
database operations:

### posts Model Helper

File: `db/models/posts.ts`

```typescript
import { getDb } from '../index.js';
import { posts } from '../schema.js';

// Find all posts
export async function findAllPosts() {
  const db = getDb();
  return await db.select().from(posts);
}

// Find post by ID
export async function findPostById(id: number) {
  const db = getDb();
  const result = await db.select().from(posts).where(eq(posts.id, id));
  return result[0] || null;
}

// Create new post
export async function createPost(data: { title: string; content?: string }) {
  const db = getDb();
  const [post] = await db.insert(posts).values(data).returning();
  return post;
}

// Update post
export async function updatePost(id: number, data: Partial<typeof data>) {
  const db = getDb();
  const [post] = await db.update(posts).set(data).where(eq(posts.id, id)).returning();
  return post;
}

// Remove post
export async function removePost(id: number) {
  const db = getDb();
  await db.delete(posts).where(eq(posts.id, id));
}
```

## Database Workflow

### 1. Create New Model

```bash
# Generate model with fields
kagaribi model new comments postId:integer userId:integer body:text

# What this creates:
# - Adds table to db/schema.ts
# - Generates db/models/comments.ts with helper functions
# - Updates db/models/index.ts to export helpers
```

### 2. Generate Migration

```bash
pnpm run db:generate
# Creates migration files in drizzle/ directory
```

### 3. Apply Migration

```bash
pnpm run db:migrate
# Applies migrations to database specified in DATABASE_URL
```

### 4. Query Data

Use model helpers in your package code:

```typescript
import { findAllPosts, createPost } from '../../../db/models/posts.js';

// In your route handler
app.get('/api/posts', async (c) => {
  const posts = await findAllPosts();
  return c.json(posts);
});

app.post('/api/posts', async (c) => {
  const { title, content } = await c.req.json();
  const post = await createPost({ title, content });
  return c.json(post, 201);
});
```

## Configuration

### Database Configuration

See `kagaribi.config.ts`:

```typescript
export default defineConfig({
  packages: {
    root: { target: 'node' },
    posts: { colocateWith: 'root' },
  },
  db: {
    dialect: 'postgresql',  // Database type
  },
});
```

### Drizzle Configuration

See `drizzle.config.ts`:

```typescript
export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};
```

### Environment Variables

Create `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/blog
```

## Development Workflow

### Initial Setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run migrations
pnpm run db:migrate

# Start development server
pnpm run dev
```

### Adding a New Table

1. Generate model:
   ```bash
   kagaribi model new categories name:string description:text
   ```

2. Review generated code:
   - Check `db/schema.ts` for table definition
   - Check `db/models/categories.ts` for helpers

3. Generate and apply migration:
   ```bash
   pnpm run db:generate
   pnpm run db:migrate
   ```

4. Use in your package:
   ```typescript
   import { findAllCategories, createCategory } from '../../../db/models/categories.js';
   ```

### Modifying Existing Schema

1. Edit `db/schema.ts` manually:
   ```typescript
   export const posts = pgTable('posts', {
     id: serial('id').primaryKey(),
     title: text('title').notNull(),
     content: text('content'),
     categoryId: integer('category_id').references(() => categories.id),  // Add field
     createdAt: timestamp('created_at').defaultNow().notNull(),
   });
   ```

2. Generate migration:
   ```bash
   pnpm run db:generate
   ```

3. Apply migration:
   ```bash
   pnpm run db:migrate
   ```

4. Update model helpers if needed in `db/models/posts.ts`

## Using Database in Packages

### Initialize Database Connection

```typescript
import { Hono } from 'hono';
import { createDbMiddleware } from '@kagaribi/core';
import { initDb } from '../../../db/index.js';

const app = new Hono()
  // Initialize database from environment
  .use('*', createDbMiddleware({ initFn: initDb }))

  // Your routes here
  .get('/api/posts', async (c) => {
    // Database is initialized and ready
  });
```

### Query with Model Helpers

```typescript
import { findAllPosts, createPost, updatePost, removePost } from '../../../db/models/posts.js';

app
  .get('/api/posts', async (c) => {
    const posts = await findAllPosts();
    return c.json(posts);
  })
  .post('/api/posts', async (c) => {
    const data = await c.req.json();
    const post = await createPost(data);
    return c.json(post, 201);
  })
  .put('/api/posts/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const data = await c.req.json();
    const post = await updatePost(id, data);
    return c.json(post);
  })
  .delete('/api/posts/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    await removePost(id);
    return c.json({ success: true });
  });
```

### Direct Database Queries

For complex queries not covered by helpers:

```typescript
import { getDb, schema } from '../../../db/index.js';
import { eq, and, or, gt, lt } from 'drizzle-orm';

app.get('/api/posts/search', async (c) => {
  const db = getDb();
  const { query } = c.req.query();

  const posts = await db
    .select()
    .from(schema.posts)
    .where(
      or(
        eq(schema.posts.title, query),
        eq(schema.posts.content, query)
      )
    );

  return c.json(posts);
});
```

## Database Management Commands

```bash
# Generate migration from schema changes
pnpm run db:generate

# Apply migrations to database
pnpm run db:migrate

# Open Drizzle Studio (database GUI)
pnpm run db:studio

# Build database helpers for production
pnpm run build:db
```

## Per-Package CLAUDE.md Template

For packages with database access:

```markdown
# [Package Name] Package - Development Guide

## Purpose
[Brief description]

## Database Models Used
- `[model]` - [usage description]
- `[model]` - [usage description]

## Routes
- `GET /api/[resource]` - [description]
- `POST /api/[resource]` - [description]
- `PUT /api/[resource]/:id` - [description]
- `DELETE /api/[resource]/:id` - [description]

## Database Queries

### Model Helpers
\`\`\`typescript
import { findAll[Model], create[Model] } from '../../../db/models/[model].js';
\`\`\`

### Custom Queries
\`\`\`typescript
import { getDb, schema } from '../../../db/index.js';
import { eq } from 'drizzle-orm';

const db = getDb();
const results = await db.select().from(schema.[table]).where(eq(schema.[table].id, id));
\`\`\`

## Migration Notes
- [Any schema dependencies]
- [Data migration considerations]

## Testing with Database
- [Test database setup]
- [Seed data approach]
- [Cleanup strategy]
```

## Common Database Patterns

### Filtering and Sorting

```typescript
import { getDb, schema } from '../../../db/index.js';
import { eq, desc } from 'drizzle-orm';

// Get recent posts
const recentPosts = await db
  .select()
  .from(schema.posts)
  .orderBy(desc(schema.posts.createdAt))
  .limit(10);
```

### Joins

```typescript
// Get posts with user information
const postsWithAuthors = await db
  .select({
    id: schema.posts.id,
    title: schema.posts.title,
    authorName: schema.users.name,
    authorEmail: schema.users.email,
  })
  .from(schema.posts)
  .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id));
```

### Transactions

```typescript
import { getDb } from '../../../db/index.js';

const db = getDb();

await db.transaction(async (tx) => {
  const [user] = await tx.insert(schema.users).values({ name, email }).returning();
  await tx.insert(schema.posts).values({ title, content, userId: user.id });
});
```

## Reference Documentation

For detailed information:
- Database field types → `.claude/skills/development/references/database.md`
- Configuration options → `.claude/skills/development/references/configuration.md`
- Development workflows → `.claude/skills/development/SKILL.md`

## Troubleshooting

**Issue:** Database connection fails
- **Check:** `DATABASE_URL` in `.env` is correct
- **Check:** PostgreSQL server is running
- **Check:** Database exists and user has permissions

**Issue:** Migration fails
- **Check:** No syntax errors in `db/schema.ts`
- **Check:** Previous migrations applied successfully
- **Check:** Database connection is working

**Issue:** Model helper not found
- **Check:** Model is exported from `db/models/index.ts`
- **Check:** `pnpm run build:db` was run after model creation

**Issue:** Type errors with Drizzle queries
- **Check:** Import correct operators from `drizzle-orm`
- **Check:** Schema types match actual database columns
- **Check:** TypeScript is up to date (`pnpm install`)
