# Models Guide

This guide explains how to create model helpers in Kagaribi applications using the `ModelBase` class.

## Overview

Model helpers are classes that encapsulate database operations for a specific table. They extend `ModelBase` to automatically access the global database instance, making them work seamlessly across all platforms (Node.js, Cloudflare Workers, etc.).

## Why Use Model Helpers?

✅ **Benefits:**
- Type-safe database operations
- Reusable across packages
- Platform-independent (works with Node.js and Cloudflare Workers)
- Cleaner code with less repetition
- Easy to test
- Automatic database instance access

❌ **Without Models:**
```typescript
// Repetitive and verbose
app.get('/users', async (c) => {
  const db = getDb();
  const users = await db.select().from(schema.users);
  return c.json(users);
});

app.get('/users/:id', async (c) => {
  const db = getDb();
  const id = Number(c.req.param('id'));
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!user) return c.json({ error: 'Not found' }, 404);
  return c.json(user);
});
```

✅ **With Models:**
```typescript
// Clean and reusable
app.get('/users', async (c) => {
  const users = await Users.findAll();
  return c.json(users);
});

app.get('/users/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const user = await Users.findById(id);
  if (!user) return c.json({ error: 'Not found' }, 404);
  return c.json(user);
});
```

## Basic Model Structure

### File Location

```text
db/
  models/
    users.ts
    posts.ts
  schema.ts
  index.ts
```

### Creating a Model

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

## Key Concepts

### ModelBase Class

`ModelBase` provides a `getDb()` method that returns the global database instance:

```typescript
export class Users extends ModelBase {
  static async findAll() {
    // this.getDb() returns the database instance
    return this.getDb().select().from(users);
  }
}
```

**How it works:**
1. When you call `createDb()` in your application, Kagaribi registers a global database instance
2. `ModelBase.getDb()` accesses this global instance
3. Your model methods can use `this.getDb()` to perform database operations

### Static Methods

Model methods are **static** because you call them on the class itself:

```typescript
// ✅ Correct - static method call
const users = await Users.findAll();

// ❌ Wrong - don't instantiate models
const usersModel = new Users();
const users = await usersModel.findAll();
```

### Return Types

Always return:
- `null` for single records not found
- Empty arrays `[]` for queries with no results
- The actual record(s) when found

```typescript
static async findById(id: number) {
  const [record] = await this.getDb()
    .select()
    .from(users)
    .where(eq(users.id, id));
  return record ?? null;  // ✅ Return null if not found
}
```

## Common Patterns

### Find All with Filtering

```typescript
export class Posts extends ModelBase {
  /**
   * Get all posts, optionally filtered by published status
   */
  static async findAll(filters?: { published?: boolean }) {
    const query = this.getDb().select().from(posts);

    if (filters?.published !== undefined) {
      return query.where(eq(posts.published, filters.published));
    }

    return query;
  }
}
```

### Find with Relations

```typescript
export class Posts extends ModelBase {
  /**
   * Get post with author information
   */
  static async findByIdWithAuthor(id: number) {
    const [record] = await this.getDb()
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, id));

    return record ?? null;
  }
}
```

### Pagination

```typescript
import { sql } from 'drizzle-orm';

export class Users extends ModelBase {
  /**
   * Get paginated users
   */
  static async findPaginated(page: number, perPage: number = 20) {
    const offset = (page - 1) * perPage;

    const records = await this.getDb()
      .select()
      .from(users)
      .limit(perPage)
      .offset(offset);

    const [{ count }] = await this.getDb()
      .select({ count: sql`count(*)` })
      .from(users);

    return {
      data: records,
      pagination: {
        page,
        perPage,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / perPage),
      },
    };
  }
}
```

### Search

```typescript
import { like, or } from 'drizzle-orm';

export class Posts extends ModelBase {
  /**
   * Search posts by title or content
   */
  static async search(query: string) {
    return this.getDb()
      .select()
      .from(posts)
      .where(
        or(
          like(posts.title, `%${query}%`),
          like(posts.content, `%${query}%`)
        )
      );
  }
}
```

### Soft Delete

```typescript
import { eq, isNull } from 'drizzle-orm';

export class Users extends ModelBase {
  /**
   * Soft delete a user (set deleted_at timestamp)
   */
  static async softDelete(id: number) {
    const [deleted] = await this.getDb()
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return deleted ?? null;
  }

  /**
   * Get only non-deleted users
   */
  static async findAllActive() {
    return this.getDb()
      .select()
      .from(users)
      .where(isNull(users.deletedAt));
  }
}
```

## Using Models in Packages

### API Routes

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
    const users = await Users.findAll();
    return c.json(users);
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const user = await Users.findById(id);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json(user);
  })
  .post('/', async (c) => {
    const data = await c.req.json();
    const user = await Users.create(data);
    return c.json(user, 201);
  })
  .put('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const data = await c.req.json();
    const user = await Users.update(id, data);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json(user);
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const user = await Users.remove(id);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json({ message: 'User deleted', user });
  });

export default app;
```

### Views

```tsx
// packages/root/src/index.tsx
import { Hono } from 'hono';
import { createDb, createDbMiddleware } from '@kagaribi/core';
import * as schema from '../../../db/schema.js';
import { Posts } from '../../../db/models/posts.js';
import { PostsList } from '../views/PostsList';

const { initDb } = createDb('postgresql', schema);

const app = new Hono()
  .use('*', createDbMiddleware({ initFn: initDb }))
  .get('/posts', async (c) => {
    const posts = await Posts.findAll();
    return c.html(<PostsList posts={posts} />);
  });

export default app;
```

## Testing Models

```typescript
// db/models/__tests__/users.test.ts
import { describe, it, expect } from 'vitest';
import { Users } from '../users.js';

// Note: Database is initialized automatically via createDbMiddleware in your app.
// The middleware reads DATABASE_URL from process.env (loaded by dotenv in vitest.config.ts)
// No need to call initDb() manually in tests.

describe('Users Model', () => {
  it('should create a user', async () => {
    const user = await Users.create({
      name: 'Test User',
      email: 'test@example.com',
      age: 25,
      is_active: true,
    });

    expect(user).toHaveProperty('id');
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
  });

  it('should find user by ID', async () => {
    const created = await Users.create({
      name: 'Find Me',
      email: 'findme@example.com',
      age: 30,
      is_active: true,
    });

    const found = await Users.findById(created.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Find Me');
  });

  it('should return null for non-existent user', async () => {
    const user = await Users.findById(99999);
    expect(user).toBeNull();
  });
});
```

## Best Practices

### 1. Use Explicit Type Definitions

```typescript
// ✅ Good - explicit types
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
```

### 2. Return Consistent Types

```typescript
// ✅ Good - always return null for not found
static async findById(id: number) {
  const [record] = await this.getDb()
    .select()
    .from(users)
    .where(eq(users.id, id));
  return record ?? null;
}

// ❌ Bad - inconsistent return type
static async findById(id: number) {
  const [record] = await this.getDb()
    .select()
    .from(users)
    .where(eq(users.id, id));
  return record;  // Returns undefined if not found
}
```

### 3. Don't Split Unnecessarily

```typescript
// ✅ Good - concise
static async findAll() {
  return this.getDb().select().from(users);
}

// ❌ Bad - unnecessary variable
static async findAll() {
  const db = this.getDb();
  return await db.select().from(users);
}
```

### 4. Use Descriptive Method Names

```typescript
// ✅ Good
static async findById(id: number) { ... }
static async findByEmail(email: string) { ... }
static async findAllActive() { ... }

// ❌ Bad
static async get(id: number) { ... }
static async getByMail(email: string) { ... }
static async active() { ... }
```

### 5. Document Complex Methods

```typescript
/**
 * Find posts with pagination and optional filters
 *
 * @param page - Page number (1-indexed)
 * @param perPage - Number of items per page
 * @param filters - Optional filters (published, authorId, etc.)
 * @returns Paginated posts with metadata
 */
static async findPaginated(
  page: number,
  perPage: number = 20,
  filters?: { published?: boolean; authorId?: number }
) {
  // Implementation...
}
```

## Common Mistakes

### ❌ Don't Use process.env Directly

```typescript
// ❌ Wrong - not compatible with Cloudflare Workers
static async findAll() {
  const dbUrl = process.env.DATABASE_URL;
  // ...
}
```

**Solution:** Use `createDbMiddleware` to handle environment variables automatically.

### ❌ Don't Create Model Instances

```typescript
// ❌ Wrong - models are static
const usersModel = new Users();
const users = await usersModel.findAll();
```

**Solution:** Call static methods directly:

```typescript
// ✅ Correct
const users = await Users.findAll();
```

### ❌ Don't Mix Schema and Model Logic

```typescript
// ❌ Wrong - importing schema in routes
import { users } from '../../../db/schema.js';

app.get('/users', async (c) => {
  const db = getDb();
  return c.json(await db.select().from(users));
});
```

**Solution:** Use model helpers:

```typescript
// ✅ Correct
import { Users } from '../../../db/models/users.js';

app.get('/users', async (c) => {
  return c.json(await Users.findAll());
});
```

## Next Steps

- [Database Guide](./database.md) - Learn about database setup and configuration
- [Views Guide](./views.md) - Learn how to render views with fetched data
- [PostgreSQL Blog Example](../../examples/postgresql-blog/) - See models in action

## Summary

✅ **DO:**
- Extend `ModelBase` for all models
- Use static methods
- Return `null` for not found records
- Use explicit type definitions
- Keep methods focused and reusable

❌ **DON'T:**
- Create model instances
- Use `process.env` directly
- Mix schema imports with route logic
- Use inconsistent return types
