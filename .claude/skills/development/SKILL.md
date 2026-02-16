---
name: development
description: Create packages, generate models, and develop Kagaribi applications locally
---

# Development Skill

Guide Claude through package creation, model generation, local development, and
inter-package communication.

## Kagaribi's Design Philosophy

Kagaribi is designed as a **framework for the AI coding agent era**.

### Why Package-Based Architecture?

1. **Context Minimization**
   - Each package functions as an independent Hono application
   - AI agents only need to read the code of required packages
   - No need to understand the entire codebase

2. **Separation of Concerns**
   - Inspired by Web Components' independence model
   - Each package has a clear scope of responsibility
   - No need to know implementation details of other packages

3. **Type Safety**
   - Fully leverages TypeScript's type system
   - Inter-package communication is type-safe via `getClient<T>()`
   - AI agents can generate accurate code from type information

### Maintaining Independence

Each package is independent in these aspects:
- Own routes and handlers
- Own business logic
- Own deployment target
- Dependencies on other packages are type definitions only (not implementation)

## Core Commands

### Create New Package

```bash
npx kagaribi new <name> [--node|--cloudflare|--lambda|--cloudrun|--deno]
```

**Examples:**
```bash
# Co-located package (runs with root by default)
npx kagaribi new users

# Package targeting Cloudflare Workers
npx kagaribi new payments --cloudflare

# Package targeting AWS Lambda
npx kagaribi new analytics --lambda
```

**What gets created:**
- `packages/<name>/kagaribi.package.ts` - Package manifest
- `packages/<name>/src/index.ts` - Hono app template
- Updates `kagaribi.config.ts` with new package entry

### Start Development Server

```bash
npx kagaribi dev [port]
```

**Examples:**
```bash
npx kagaribi dev         # http://localhost:3000 (default)
npx kagaribi dev 8080    # http://localhost:8080
```

All packages run in a single process with automatic routing.

### Generate Database Models

```bash
npx kagaribi model new <table> <field:type>... [--db postgresql|mysql]
```

**Supported field types:** `string`, `integer`, `boolean`, `timestamp`, `text`

**Examples:**
```bash
# Generate posts table with title and content
npx kagaribi model new posts title:string content:text --db postgresql

# Generate products table
npx kagaribi model new products name:string price:integer stock:integer

# Auto-detect database dialect from config
npx kagaribi model new comments postId:integer userId:integer body:text
```

**What gets created:**
- Appends table definition to `db/schema.ts`
- Generates `db/models/<table>.ts` with helper functions
- Updates `db/models/index.ts` to export the model

**After generation:**
```bash
pnpm run db:generate  # Create migration files
pnpm run db:migrate   # Apply to database
```

## Package Independence

Each package is a **self-contained Hono application**:
- Has its own routes and handlers
- Exports a Hono `app` instance
- Can depend on other packages via RPC
- Runs independently or co-located with others

### Package Structure

```
packages/
  users/
    kagaribi.package.ts    # Manifest (dependencies, routes, runtime)
    src/
      index.ts             # Hono app with routes
```

## When to Create New Packages vs Extend Existing

### Create a New Package When:
- **Separate deployment** - The feature will be deployed independently
- **Different scaling needs** - Requires different resources or regions
- **Clear domain boundary** - Distinct business logic (users, payments, notifications)
- **Different runtime requirements** - One needs edge computing, another needs full Node.js
- **Team ownership** - Different teams own different features

### Extend Existing Package When:
- **Tightly coupled logic** - Feature is closely related to existing functionality
- **Shared state** - Needs direct access to the same database connections or in-memory data
- **Simple project** - Small projects don't need multiple packages initially
- **Development convenience** - Faster iteration without RPC overhead during prototyping

**Example decision:**
- User authentication → New package (`auth`) - independent concern
- User profile CRUD → Extend `users` package - tightly coupled to user data
- Payment processing → New package (`payments`) - separate domain
- Invoice generation → Could extend `payments` or be separate based on deployment needs

## Package Configuration

Edit `packages/<name>/kagaribi.package.ts` to define dependencies and routes:

```typescript
import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'articles',
  dependencies: ['users', 'auth'],  // Required packages
  routes: [
    '/users/:userId/articles',      // Nested routing pattern
  ],
  runtime: ['node', 'cloudflare-workers', 'deno'],
});
```

**Key fields:**
- `name` - Package identifier (must match directory name)
- `dependencies` - Other Kagaribi packages this package calls via RPC
- `routes` - Custom nested route patterns (optional)
- `runtime` - Compatible deployment targets

## Writing Package Code

### Basic Hono App

```typescript
import { Hono } from 'hono';

const app = new Hono()
  .get('/api/items', async (c) => {
    return c.json({ items: [] });
  })
  .get('/api/items/:id', async (c) => {
    const id = c.req.param('id');
    return c.json({ id, name: 'Item' });
  })
  .post('/api/items', async (c) => {
    const body = await c.req.json();
    // Create item logic
    return c.json({ id: 1, ...body }, 201);
  });

// IMPORTANT: Export type for RPC clients
export type ItemsApp = typeof app;
export default app;
```

### With Database Access

```typescript
import { Hono } from 'hono';
import { createDbMiddleware } from '@kagaribi/core';
import { getDb, initDb, schema } from '../../../db/index.js';

const app = new Hono()
  // Initialize database connection
  .use('*', createDbMiddleware({ initFn: initDb }))

  .get('/api/users', async (c) => {
    const db = getDb();
    const users = await db.select().from(schema.users);
    return c.json(users);
  })

  .post('/api/users', async (c) => {
    const db = getDb();
    const { name, email } = await c.req.json();

    const [user] = await db.insert(schema.users)
      .values({ name, email })
      .returning();

    return c.json(user, 201);
  });

export type UsersApp = typeof app;
export default app;
```

**`createDbMiddleware()` features:**
- Auto-detects Node.js (`process.env.DATABASE_URL`) or Cloudflare Workers (`c.env.DATABASE_URL`)
- Calls `initDb()` with connection string
- Ensures single initialization (idempotent)

## Inter-Package Communication Rules

**Absolute Rule: Direct inter-package communication is prohibited. Always go through the root package.**

### Why Go Through Root Package?

1. **Centralized Authentication & Authorization**
   - Root package is the entry point for all requests
   - Validates authentication and passes JWT tokens to packages
   - Individual packages don't need authentication logic

2. **Centralized Orchestration**
   - Root package coordinates calls to other packages
   - Only root package manages deployment URLs
   - Packages can focus on their own logic

3. **Clear Dependency Management**
   - Package dependencies declared in `kagaribi.package.ts` `dependencies`
   - Root package handles dependency resolution
   - Prevents circular dependencies

### Communication Pattern

```text
Client Request → Root Package → Package A
                             ↓
                             → Package B
                             ↓
                             ← Response
```

**Warning:** Direct calls from Package A to Package B is a design mistake.
Root package should aggregate necessary data before passing to each package.

## Interface Sharing

Each package **exports type definitions** to be referenced by other packages.

### Why Export Type Definitions?

1. **Improved AI Agent Accuracy**
   - Accurately understands API shape from type information
   - Prevents mistakes in arguments and return types
   - Autocomplete improves code generation accuracy

2. **Implementation Separation**
   - Share only type definitions, not implementation
   - Maintains package independence while ensuring type safety
   - Clear scope of refactoring impact

### Required Pattern

```typescript
// packages/users/src/index.ts
import { Hono } from 'hono';

const app = new Hono()
  .get('/api/users/:id', async (c) => {
    // implementation...
  });

// ✅ REQUIRED: Export type definition
export type UsersApp = typeof app;
export default app;
```

Without `export type UsersApp = typeof app`, other packages cannot call it type-safely.

## View (TSX) Rules

**Views must be written in TSX. Direct HTML string literals in code are prohibited.**

### Why Use JSX Components?

1. **Type Safety**
   - Props type checking works
   - AI agents can generate accurate code from type information
   - `html` tag literals don't have type checking

2. **Reusability**
   - Easy to reuse through componentization
   - Can separate common layouts and parts

3. **Maintainability**
   - Clear HTML structure
   - Editor support (syntax highlighting, autocomplete) works

### ❌ Prohibited

```typescript
import { html } from 'hono/html';

app.get('/', (c) => {
  return c.html(html`
    <html>
      <body>
        <h1>Hello</h1>
      </body>
    </html>
  `);
});
```

### ✅ Recommended

```typescript
import { jsx } from 'hono/jsx';

const Layout = ({ children }: { children: any }) => (
  <html>
    <body>{children}</body>
  </html>
);

const HomePage = () => (
  <Layout>
    <h1>Hello</h1>
  </Layout>
);

app.get('/', (c) => {
  return c.html(<HomePage />);
});
```

## Inter-Package Communication (RPC)

Use `getClient<T>()` for type-safe calls between packages:

**Important:** This feature is primarily used for **calling packages from the root package**.
Do not use for direct inter-package communication (see "Inter-Package Communication Rules" above).

```typescript
import { Hono } from 'hono';
import { getClient } from '@kagaribi/core';
import type { UsersApp } from '../../users/src/index.js';
import type { AuthApp } from '../../auth/src/index.js';

const users = getClient<UsersApp>('users');
const auth = getClient<AuthApp>('auth');

const app = new Hono()
  .get('/api/profile', async (c) => {
    // Call users package
    const res = await users.api.users[':id'].$get({
      param: { id: '123' },
    });
    const user = await res.json();

    return c.json(user);
  })

  .post('/api/verify', async (c) => {
    // Call auth package
    const token = c.req.header('Authorization');
    const res = await auth.api.verify.$post({
      json: { token },
    });
    const result = await res.json();

    return c.json(result);
  });

export type ProfileApp = typeof app;
export default app;
```

**Key points:**
- Works identically for local (co-located) and remote (deployed) packages
- Full TypeScript autocomplete and type checking
- Framework handles routing automatically
- No manual URL management

## Nested Routing with Parameters

### Setup Nested Routes

```typescript
// packages/articles/kagaribi.package.ts
export default definePackage({
  name: 'articles',
  dependencies: ['users'],
  routes: ['/users/:userId/articles'],  // Handle user-specific articles
});
```

### Access Route Parameters

```typescript
import { Hono } from 'hono';
import { kagaribiParamsMiddleware } from '@kagaribi/core';

const app = new Hono();

// Apply middleware to extract params from X-Kagaribi-Params header
app.use('*', kagaribiParamsMiddleware());

app.get('/', (c) => {
  // Access extracted parameters
  const userId = c.get('userId' as never) as string;
  return c.json({ userId, articles: [] });
});

app.get('/:articleId', (c) => {
  const userId = c.get('userId' as never) as string;
  const articleId = c.req.param('articleId');
  return c.json({ userId, articleId, title: 'Article Title' });
});

export type ArticlesApp = typeof app;
export default app;
```

## Development Workflow

### 1. Create Package
```bash
npx kagaribi new orders --node
```

### 2. Define Package Manifest
Edit `packages/orders/kagaribi.package.ts`:
```typescript
export default definePackage({
  name: 'orders',
  dependencies: ['users', 'payments'],
  runtime: ['node', 'cloudflare-workers'],
});
```

### 3. Generate Models (if needed)
```bash
npx kagaribi model new orders userId:integer productId:integer quantity:integer
pnpm run db:generate
pnpm run db:migrate
```

### 4. Write Application Code
Edit `packages/orders/src/index.ts` with routes and logic.

### 5. Start Dev Server
```bash
npx kagaribi dev
```

### 6. Test Locally
```bash
curl http://localhost:3000/api/orders
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"productId":42,"quantity":2}'
```

## Best Practices

1. **Always export app type** - Required for RPC: `export type XxxApp = typeof app`
2. **Use database middleware** - Apply `createDbMiddleware()` for consistent DB access
3. **Define dependencies** - List required packages in `kagaribi.package.ts`
4. **Type safety** - Leverage TypeScript for request/response validation
5. **Error handling** - Return appropriate HTTP status codes (400, 404, 500)
6. **Start simple** - Begin with one package, split when needed

## Troubleshooting

**Issue:** RPC call fails with "Package not found"
- **Solution:** Add package to `dependencies` array in `kagaribi.package.ts`

**Issue:** Database queries fail
- **Solution:** Ensure `createDbMiddleware({ initFn: initDb })` is applied before routes

**Issue:** TypeScript error on `getClient<T>()`
- **Solution:** Verify target package exports its app type (`export type XxxApp = typeof app`)

**Issue:** Model generation fails
- **Solution:** Run `npx kagaribi init --db <dialect>` first to set up database support

**Issue:** Changes not reflected
- **Solution:** Restart `npx kagaribi dev` server (hot reload not yet supported)

## Next Steps

After development:
- Use the **deployment skill** to build and deploy packages
- Refer to [USAGE.md](../../../USAGE.md) for advanced patterns
