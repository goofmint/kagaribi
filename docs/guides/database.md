# Database Guide

This guide explains how to use databases in Kagaribi applications with Drizzle ORM.

## Overview

Kagaribi provides built-in database support through Drizzle ORM with automatic driver selection. The framework handles database initialization and makes it available across all packages, whether running locally or deployed to cloud platforms.

## Supported Databases

- **PostgreSQL** - Full support with automatic pg driver selection
- **MySQL** - Full support with automatic mysql2 driver selection
- **SQLite** - Full support with D1 (Cloudflare Workers) or libsql (Node.js default, recommended). better-sqlite3 is also supported as an alternative if explicitly chosen

## Basic Setup

### 1. Initialize Project with Database

```bash
kagaribi init my-app --node --db postgresql
cd my-app
```

This creates:
- `db/schema.ts` - Database schema definitions
- `db/index.ts` - Database exports
- `drizzle.config.ts` - Drizzle Kit configuration

### 2. Define Schema

Edit `db/schema.ts`:

```typescript
import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  age: integer('age').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  created_at: timestamp('created_at').notNull().defaultNow(),
});
```

### 3. Generate and Run Migrations

```bash
# Generate migration files
pnpm db:generate

# Apply migrations
pnpm db:migrate
```

## Using Database in Packages

### Method 1: With createDbMiddleware (Recommended)

The `createDbMiddleware` automatically handles database initialization for both Node.js (`process.env`) and Cloudflare Workers (`c.env`).

```typescript
// packages/users/src/index.ts
import { Hono } from 'hono';
import { createDb, createDbMiddleware } from '@kagaribi/core';
import * as schema from '../../../db/schema.js';
import { Users } from '../../../db/models/users.js';

const { initDb } = createDb('postgresql', schema);

const app = new Hono()
  .use('*', createDbMiddleware({ initFn: initDb }))
  .get('/', async (c) => {
    const allUsers = await Users.findAll();
    return c.json(allUsers);
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const user = await Users.create(body);
    return c.json(user, 201);
  });

export default app;
```

**How it works:**
- Node.js: Reads `DATABASE_URL` from `process.env`
- Cloudflare Workers: Reads `DATABASE_URL` from `c.env`
- Automatically initializes database on first request
- No platform-specific code needed

### Method 2: Manual Initialization (Advanced)

For more control, initialize the database manually:

```typescript
import { createDb } from '@kagaribi/core';
import * as schema from '../../../db/schema.js';

const { initDb, getDb } = createDb('postgresql', schema);

// Initialize once (e.g., in serve.ts for local development)
initDb(process.env.DATABASE_URL!);

// Use anywhere in your application
const db = getDb();
const users = await db.select().from(schema.users);
```

## Creating Model Helpers

Kagaribi provides `ModelBase` class to create reusable model helpers that work across all platforms.

### Basic Model Structure

```typescript
// db/models/users.ts
import { ModelBase } from '@kagaribi/core';
import { users } from '../schema.js';
import { eq } from 'drizzle-orm';

export class Users extends ModelBase {
  /**
   * Get all users
   */
  static async findAll() {
    return this.getDb().select().from(users);
  }

  /**
   * Find user by ID
   */
  static async findById(id: number) {
    const [record] = await this.getDb()
      .select()
      .from(users)
      .where(eq(users.id, id));
    return record ?? null;
  }

  /**
   * Create a new user
   */
  static async create(data: {
    name: string;
    email: string;
    age: number;
    is_active: boolean;
  }) {
    const [created] = await this.getDb()
      .insert(users)
      .values(data)
      .returning();
    return created;
  }

  /**
   * Update a user by ID
   */
  static async update(
    id: number,
    data: {
      name?: string;
      email?: string;
      age?: number;
      is_active?: boolean;
    }
  ) {
    const [updated] = await this.getDb()
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated ?? null;
  }

  /**
   * Delete a user by ID
   */
  static async remove(id: number) {
    const [deleted] = await this.getDb()
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return deleted ?? null;
  }
}
```

See [Models Guide](./models.md) for detailed information about creating models.

## Environment Variables

### Local Development (.env file)

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

### Cloudflare Workers (wrangler.toml)

```toml
[vars]
DATABASE_URL = "postgresql://user:password@host:5432/mydb"
```

Or use D1 binding:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxx-xxx-xxx"
```

## Global Database Instance

When you call `createDb()`, Kagaribi automatically registers a global database instance that model helpers can access via `ModelBase.getDb()`.

```typescript
// This happens automatically when you call createDb()
const { initDb } = createDb('postgresql', schema);

// Models can now use this.getDb() to access the database
class Users extends ModelBase {
  static async findAll() {
    return this.getDb().select().from(users);
  }
}
```

**Important:**
- Call `createDb()` only once per application
- Use `createDbMiddleware` to handle initialization automatically
- Models inherit database access from `ModelBase`

## Platform Differences

| Feature | Node.js | Cloudflare Workers |
|---------|---------|-------------------|
| Environment Variables | `process.env` | `c.env` (context) |
| PostgreSQL Driver | `pg` | Hyperdrive/TCP |
| MySQL Driver | `mysql2` | MySQL TCP |
| SQLite Driver | `libsql` (default) or `better-sqlite3` | D1 Binding |
| Middleware | `createDbMiddleware` | `createDbMiddleware` |

`createDbMiddleware` handles these differences automatically, so you don't need platform-specific code.

## Best Practices

1. **Use createDbMiddleware** - Let the framework handle initialization
2. **Create Model Helpers** - Encapsulate database logic in model classes
3. **Extend ModelBase** - Use the base class for consistent database access
4. **Avoid Direct Schema Imports** - Use model helpers instead
5. **Use Migrations** - Always generate and run migrations for schema changes

## Testing

When testing, the database is initialized automatically via `createDbMiddleware`:

```typescript
// packages/users/src/index.test.ts
import { describe, it, expect } from 'vitest';
import app from './index';

describe('Users API', () => {
  it('GET / - should return all users', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const users = await res.json();
    expect(Array.isArray(users)).toBe(true);
  });
});
```

**Important:** Do NOT use `process.env.DATABASE_URL` directly in tests. Let `createDbMiddleware` handle it.

## Common Issues

### "Global database not initialized"

**Cause:** `createDb()` was not called, or `createDbMiddleware` is not used.

**Solution:** Make sure to call `createDb()` and use `createDbMiddleware` in your package:

```typescript
const { initDb } = createDb('postgresql', schema);

const app = new Hono()
  .use('*', createDbMiddleware({ initFn: initDb }));
```

### Environment variable not found

**Cause:** `.env` file missing or not loaded.

**Solution:**
- Create `.env` file with `DATABASE_URL`
- `createDbMiddleware` automatically reads environment variables:
  - In Node.js: reads from `process.env`
  - In Cloudflare Workers: reads from `c.env`
- For tests, load `.env` in `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load .env for tests - createDbMiddleware will use process.env
config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**Note:** Tests use `createDbMiddleware` which reads `process.env.DATABASE_URL` automatically after dotenv loads it. Do not call `initDb(process.env.DATABASE_URL!)` directly in test code.

## Next Steps

- [Models Guide](./models.md) - Learn how to create model helpers
- [Views Guide](./views.md) - Learn how to render views
- [PostgreSQL Blog Example](../../examples/postgresql-blog/) - Full example application

## Related Documentation

- [Drizzle ORM](https://orm.drizzle.team/)
- [Database Schema Reference](../database.md)
