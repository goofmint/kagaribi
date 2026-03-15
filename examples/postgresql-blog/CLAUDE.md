# PostgreSQL Blog Example - Database Pattern Comparison

This example demonstrates two database access patterns available in Kagaribi applications with Drizzle ORM.

## Database Setup

This project uses PostgreSQL with Drizzle ORM. The schema is defined in `db/schema.ts`:

- **posts** table: id, title, content, createdAt
- **users** table: id, name, email, age, is_active, createdAt

## Two Database Access Patterns

Kagaribi supports two approaches for database access in packages:

### Pattern 1: Shared Database with Model Helpers (used by `posts` package)

**When to use**: When multiple packages need to share common database operations with consistent logic.

**Structure**:
- Create model helper files in `db/models/` (e.g., `db/models/posts.ts`)
- Model helpers export functions like `findAll()`, `findById()`, `create()`, `remove()`
- Packages import and use these helper functions

**Example** ([packages/posts/src/index.ts](packages/posts/src/index.ts)):
```typescript
import { createDb, createDbMiddleware } from '@kagaribi/core';
import * as schema from '../../../db/schema.js';
import * as Posts from '../../../db/models/posts.js';

const { initDb } = createDb('postgresql', schema);

const app = new Hono()
  .use('*', createDbMiddleware({ initFn: initDb }))
  .get('/', async (c) => {
    const allPosts = await Posts.findAll();
    return c.json(allPosts);
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const post = await Posts.findById(id);
    if (!post) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json(post);
  });
```

**Advantages**:
- ✅ Centralized business logic in model helpers
- ✅ Consistent database operations across packages
- ✅ Easy to share common logic (validation, formatting, etc.)
- ✅ Simpler package code - just call helper functions

**Disadvantages**:
- ❌ Requires maintaining separate model helper files
- ❌ Less flexible for package-specific queries
- ❌ Additional layer of abstraction

### Pattern 2: Per-Package Database Access (used by `users` package)

**When to use**: When packages need maximum flexibility with package-specific database operations.

**Structure**:
- No model helper files
- Packages directly use `getDb()` and `schema` from `db/index.ts`
- Direct Drizzle ORM query building in package code

**Example** ([packages/users/src/index.ts](packages/users/src/index.ts)):
```typescript
import { createDb, createDbMiddleware } from '@kagaribi/core';
import { eq } from 'drizzle-orm';
import * as schema from '../../../db/schema.js';

const { initDb, getDb } = createDb('postgresql', schema);

const app = new Hono()
  .use('*', createDbMiddleware({ initFn: initDb }))
  .get('/', async (c) => {
    const db = getDb();
    const allUsers = await db.select().from(schema.users);
    return c.json(allUsers);
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const db = getDb();
    const user = await db.select().from(schema.users).where(eq(schema.users.id, id));
    if (user.length === 0) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json(user[0]);
  });
```

**Advantages**:
- ✅ Maximum flexibility - use any Drizzle ORM query
- ✅ No need to maintain model helper files
- ✅ Package-specific query optimization
- ✅ Direct control over database operations

**Disadvantages**:
- ❌ Business logic lives in package code
- ❌ Potential code duplication across packages
- ❌ Less consistent database operations

## Choosing the Right Pattern

**Use Shared Database with Model Helpers when**:
- Multiple packages access the same tables
- You want consistent business logic across packages
- You prefer centralized validation and data formatting
- You want simpler package code

**Use Per-Package Database Access when**:
- Each package has unique database requirements
- You need maximum query flexibility
- You prefer minimal abstraction layers
- You want direct control over database operations

## Running This Example

1. **Setup PostgreSQL database**:
   ```bash
   # Start PostgreSQL (using Docker or local installation)
   docker run -d -p 5432:5432 \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=blogdb \
     postgres:15
   ```

2. **Configure environment variables**:
   ```bash
   # Create .env file
   echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/blogdb" > .env
   ```

3. **Generate and apply migrations**:
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit push
   ```

4. **Start development server**:
   ```bash
   kagaribi dev
   ```

5. **Test the endpoints**:
   ```bash
   # Posts endpoints (using model helpers)
   curl http://localhost:3000/posts
   curl -X POST http://localhost:3000/posts \
     -H "Content-Type: application/json" \
     -d '{"title":"Hello World","content":"My first post"}'

   # Users endpoints (using direct DB access)
   curl http://localhost:3000/users
   curl -X POST http://localhost:3000/users \
     -H "Content-Type: application/json" \
     -d '{"name":"Alice","email":"alice@example.com","age":30,"is_active":true}'
   ```

## Key Files

- [db/schema.ts](db/schema.ts) - Database schema definition
- [db/models/posts.ts](db/models/posts.ts) - Model helper for posts (Pattern 1)
- [packages/posts/src/index.ts](packages/posts/src/index.ts) - Posts package using model helpers and `createDb()`
- [packages/users/src/index.ts](packages/users/src/index.ts) - Users package using direct DB access with `createDb()`
- [kagaribi.config.ts](kagaribi.config.ts) - Package configuration

## Further Reading

- [Kagaribi Database Guide](../../docs/database.md) - Comprehensive database documentation
- [Drizzle ORM Documentation](https://orm.drizzle.team/) - Official Drizzle ORM docs
