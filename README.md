# kagaribi (篝火)

> **Framework for the AI Coding Agent Era**

A Hono-based microservices framework for monorepos. Develop packages locally in a single process, then deploy individually to Cloudflare Workers, AWS Lambda, Google Cloud Run, Deno Deploy, or Node.js.

## Features

- **Package-based architecture** - Split features into independent Hono apps
- **Transparent RPC** - Call other packages with `getClient()` regardless of local or remote deployment
- **Multi-target deployment** - Deploy from one codebase to multiple cloud platforms
- **Co-location** - Run all packages in a single process during development, split in production
- **Nested routing** - Cross-package path patterns like `/users/:userId/articles`
- **WebComponent UI** - Each package can serve both API and UI
- **Database support** - Built-in Drizzle ORM integration with PostgreSQL/MySQL

## Architecture Philosophy

Kagaribi is designed as a **framework for the AI coding agent era**, enabling AI to work efficiently with distributed systems.

### Context Minimization Through Package Separation

Traditional monolithic applications require AI agents to understand the entire codebase before making changes. Kagaribi's package-based architecture solves this:

- **Each package is an independent Hono application** - AI agents only need to read the specific package being modified
- **Clear separation of concerns** - Each package has a well-defined responsibility (users, payments, notifications, etc.)
- **No need to understand the whole codebase** - Package independence means changes are isolated and predictable

### Independence Model Inspired by Web Components

Just as Web Components encapsulate functionality without knowing about other components, Kagaribi packages:

- Have their own routes and handlers
- Contain their own business logic
- Can be deployed independently
- Depend only on type definitions, not implementations

### Interface Sharing for AI Agent Precision

Kagaribi leverages TypeScript's type system to help AI agents generate accurate code:

```typescript
// packages/users/src/index.ts
const app = new Hono()
  .get('/api/users/:id', async (c) => {
    // implementation...
  });

// ✅ Export type definition for other packages
export type UsersApp = typeof app;
export default app;
```

With this pattern:
- **AI agents understand API shapes** from type information alone
- **Autocomplete and type checking** prevent mistakes in inter-package calls
- **Refactoring impact** is clear and bounded

### Communication Flow

```text
Client → Root Package (Auth/Routing)
           │
           ├─ Local: app.route() direct mount
           │    └─ Same process, function calls
           │
           └─ Remote: proxyMiddleware HTTP proxy
                └─ Different FaaS platforms
                     ├─ Cloudflare Workers
                     ├─ AWS Lambda
                     ├─ Google Cloud Run
                     └─ Deno Deploy
```

## Requirements

- Node.js >= 22.6.0
- pnpm

## Quick Start

```bash
# Create a new project (using npx - no installation needed)
npx kagaribi init my-project
cd my-project

# Install dependencies
pnpm install

# Start the development server
npx kagaribi dev        # http://localhost:3000
```

### With Database Support

```bash
# Create a project with PostgreSQL
npx kagaribi init my-blog --db postgresql
cd my-blog

# Install dependencies
pnpm install

# Configure database connection
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run migrations and start
pnpm run db:migrate
pnpm run dev
```

## Package Communication

**Absolute Rule: All inter-package communication must go through the root package.**

### Why Root Package Orchestration?

1. **Centralized Authentication** - Root package validates credentials and issues JWT tokens
2. **Centralized Routing** - Only root knows where packages are deployed
3. **Clear Dependencies** - Prevents circular dependencies and maintains clean architecture

### Type-Safe RPC with `getClient<T>()`

Call other packages with full TypeScript type safety:

```typescript
import { getClient } from '@kagaribi/core';
import type { UsersApp } from '../../users/src/index.js';

// Works identically for local (same process) and remote (HTTP) calls
const users = getClient<UsersApp>('users');
const res = await users.api.users[':id'].$get({ param: { id: '123' } });
const user = await res.json();
```

### Transparent Local/Remote Switching

Kagaribi automatically switches communication methods based on deployment:

| Deployment Mode | Communication Method | How It Works |
|-----------------|---------------------|--------------|
| **Co-location** (development) | Direct function calls | No HTTP overhead, lowest latency |
| **Distributed** (production) | HTTP RPC | Uses `url` from `kagaribi.config.ts` |

**Your package code never changes** - the framework handles the switching.

### Required Type Export Pattern

Every package must export its app type:

```typescript
// packages/payments/src/index.ts
import { Hono } from 'hono';

const app = new Hono()
  .post('/api/charge', async (c) => {
    // payment logic
  });

// ✅ REQUIRED: Export type for RPC clients
export type PaymentsApp = typeof app;
export default app;
```

Without this export, other packages cannot call it type-safely.

## Deployment Model

### Independent Package Deployment

Each package can be deployed to **different FaaS platforms** based on requirements:

```typescript
// kagaribi.config.ts
export default defineConfig({
  packages: {
    root: { target: 'node' },                    // Traditional server
    users: { target: 'cloudflare-workers' },     // Edge computing for speed
    payments: { target: 'aws-lambda' },          // Existing AWS infrastructure
    analytics: { target: 'google-cloud-run' },   // Container-based batch processing
  },
});
```

### Co-location vs Distributed Deployment

**Co-location** bundles multiple packages into a single deployment:

```typescript
export default defineConfig({
  packages: {
    root: { target: 'node' },
    auth: { colocateWith: 'root' },      // Runs in same process as root
    users: { colocateWith: 'root' },     // Runs in same process as root
    payments: { target: 'aws-lambda' },  // Deployed separately
  },
});
```

**Benefits of co-location:**
- Simpler infrastructure (fewer deployments)
- Lower latency (no HTTP between packages)
- Reduced costs
- Ideal for development and small-to-medium projects

**When to deploy separately:**
- Different scaling requirements
- Different geographic regions needed
- Security isolation required
- Team-based ownership boundaries

### Environment-Specific Configuration

Define different deployment strategies per environment:

```typescript
export default defineConfig({
  packages: {
    root: { target: 'node' },
  },
  environments: {
    development: {
      packages: {
        '*': { colocateWith: 'root' },  // Everything local
      },
    },
    production: {
      packages: {
        users: {
          target: 'cloudflare-workers',
          url: '$PROD_USERS_URL',
        },
        payments: {
          target: 'aws-lambda',
          url: '$PROD_PAYMENTS_URL',
        },
      },
    },
  },
});
```

Deploy to specific environment:

```bash
npx kagaribi deploy --env production
```

### Supported Platforms

| Platform | Target Flag | Use Case |
|----------|------------|----------|
| **Cloudflare Workers** | `--cloudflare` | Edge computing, global low-latency APIs |
| **AWS Lambda** | `--lambda` | Serverless, integration with AWS services |
| **Google Cloud Run** | `--cloudrun` | Container-based, flexible workloads |
| **Deno Deploy** | `--deno` | Edge runtime, TypeScript-first |
| **Node.js** | `--node` | Traditional servers, VPS, self-hosted |

### Automatic URL Management

After deployment, `kagaribi.config.ts` is automatically updated:

```typescript
// Before deployment
users: { target: 'cloudflare-workers' },

// After deployment (auto-updated)
users: {
  target: 'cloudflare-workers',
  url: 'https://users.your-project.workers.dev',
},
```

This enables automatic service discovery for RPC calls.

## CLI Reference

### `kagaribi init`

Create a new Kagaribi project.

**Syntax:**
```bash
npx kagaribi init <name> [--db postgresql|mysql] [--node|--cloudflare|--lambda|--cloudrun|--deno]
```

**Options:**
- `<name>` - Project directory name (required)
- `--db <dialect>` - Initialize with database support (PostgreSQL or MySQL)
- `--node` - Set Node.js as default target (default)
- `--cloudflare` - Set Cloudflare Workers as default target
- `--lambda` - Set AWS Lambda as default target
- `--cloudrun` - Set Google Cloud Run as default target
- `--deno` - Set Deno Deploy as default target

**Examples:**
```bash
# Basic project
npx kagaribi init my-api

# Project with PostgreSQL database
npx kagaribi init blog-api --db postgresql

# Project targeting Cloudflare Workers
npx kagaribi init edge-api --cloudflare

# Project with MySQL and AWS Lambda target
npx kagaribi init shop-api --db mysql --lambda
```

**Generated Files:**
- `package.json` - Dependencies and scripts
- `kagaribi.config.ts` - Deployment configuration
- `tsconfig.json` - TypeScript configuration
- `packages/root/` - Root package (entry point)
- `db/` - Database setup (if `--db` flag used)

---

### `kagaribi new`

Create a new package in the project.

**Syntax:**
```bash
npx kagaribi new <name> [--node|--cloudflare|--lambda|--cloudrun|--deno]
```

**Options:**
- `<name>` - Package name (required)
- Target flags - Specify deployment target (optional, defaults to co-location with root)

**Examples:**
```bash
# Co-located package (runs with root)
npx kagaribi new users

# Package targeting Cloudflare Workers
npx kagaribi new payments --cloudflare

# Package targeting AWS Lambda
npx kagaribi new analytics --lambda
```

**Generated Files:**
- `packages/<name>/kagaribi.package.ts` - Package manifest
- `packages/<name>/src/index.ts` - Hono app template
- Updates `kagaribi.config.ts` with new package entry

---

### `kagaribi model new`

Generate a database model with Drizzle ORM.

**Syntax:**
```bash
npx kagaribi model new <table> <field:type>... [--db postgresql|mysql]
```

**Supported Field Types:**
- `string` - Text field (VARCHAR)
- `integer` - Integer number
- `boolean` - Boolean (true/false)
- `timestamp` - Timestamp with timezone
- `text` - Long text (TEXT)

**Examples:**
```bash
# Generate posts table
npx kagaribi model new posts title:string content:text published:boolean --db postgresql

# Generate users table
npx kagaribi model new users name:string email:string age:integer

# Generate orders table (auto-detects dialect from config)
npx kagaribi model new orders userId:integer productId:integer quantity:integer total:integer
```

**Generated/Updated Files:**
- `db/schema.ts` - Appends table definition
- `db/models/<table>.ts` - Helper functions for the model
- `db/models/index.ts` - Exports the new model

**After generation:**
```bash
pnpm run db:generate  # Create migration files
pnpm run db:migrate   # Apply migrations to database
```

---

### `kagaribi dev`

Start the development server with all packages co-located.

**Syntax:**
```bash
npx kagaribi dev [port]
```

**Options:**
- `[port]` - Port number (default: 3000)

**Examples:**
```bash
npx kagaribi dev        # Starts at http://localhost:3000
npx kagaribi dev 8080   # Starts at http://localhost:8080
```

**What happens:**
- All packages run in a single Node.js process
- Routes are mounted using `app.route()`
- Hot reload not supported (restart server after code changes)
- Database connection pooling works efficiently (shared connection)

---

### `kagaribi build`

Build packages for deployment.

**Syntax:**
```bash
npx kagaribi build [--env <environment>]
```

**Options:**
- `--env <name>` - Use configuration from `environments.<name>` in `kagaribi.config.ts`

**Examples:**
```bash
npx kagaribi build                    # Build with default configuration
npx kagaribi build --env production   # Build with production environment config
npx kagaribi build --env staging      # Build with staging environment config
```

**Output:**
```text
dist/
  root/
    index.js          # Bundled application
    wrangler.toml     # Cloudflare Workers config (if applicable)
    Dockerfile        # Google Cloud Run config (if applicable)
  users/
    index.js
  payments/
    index.js
```

---

### `kagaribi deploy`

Deploy packages to cloud platforms.

**Syntax:**
```bash
npx kagaribi deploy [package] [--cloudflare|--lambda|--cloudrun|--deno|--node] [--env <environment>]
```

**Modes:**

1. **Dry-run mode** (no flags) - Shows deployment instructions without deploying:
   ```bash
   npx kagaribi deploy
   npx kagaribi deploy users
   ```

2. **Deploy specific package to target:**
   ```bash
   npx kagaribi deploy users --cloudflare
   npx kagaribi deploy payments --lambda
   ```

3. **Deploy all undeployed packages to target:**
   ```bash
   npx kagaribi deploy --cloudflare
   npx kagaribi deploy --lambda
   ```

4. **Deploy using environment configuration:**
   ```bash
   npx kagaribi deploy --env production
   npx kagaribi deploy --env staging
   ```

**Platform Requirements:**

| Platform | Required Tool | Setup |
|----------|--------------|-------|
| Cloudflare Workers | `wrangler` | `npm i -g wrangler && wrangler login` |
| AWS Lambda | `aws` CLI | `aws configure` + set `AWS_LAMBDA_ROLE_ARN` |
| Google Cloud Run | `gcloud` CLI | `gcloud auth login` + set project |
| Deno Deploy | `deployctl` | `npm i -g deployctl` |
| Node.js | None | Manual deployment to your server |

**Examples:**
```bash
# Deploy users package to Cloudflare Workers
npx kagaribi deploy users --cloudflare

# Deploy payments to AWS Lambda
export AWS_LAMBDA_ROLE_ARN=arn:aws:iam::123456789012:role/lambda-role
npx kagaribi deploy payments --lambda

# Deploy API to Google Cloud Run
export CLOUD_RUN_REGION=us-central1
npx kagaribi deploy api --cloudrun

# Deploy all packages using production config
npx kagaribi deploy --env production
```

**After deployment:**
- `kagaribi.config.ts` is automatically updated with the deployed URL
- RPC calls automatically route to the deployed service
- No code changes needed in packages

---

## Database Support

### Creating a Database-Enabled Project

```bash
# PostgreSQL
npx kagaribi init my-project --db postgresql

# MySQL
npx kagaribi init my-project --db mysql
```

**Generated files:**
- `db/schema.ts` - Drizzle ORM schema definitions
- `db/index.ts` - Database connection helpers (`initDb`, `getDb`)
- `db/models/index.ts` - Model exports
- `drizzle.config.ts` - Drizzle Kit configuration
- `.env.example` - Environment variable template

### Database Scripts

| Script | Description |
|--------|-------------|
| `build:db` | Compile `db/*.ts` to `db/*.js` |
| `dev` | Build db and start development server |
| `db:generate` | Generate migration files from schema |
| `db:migrate` | Apply migrations to database |
| `db:studio` | Launch Drizzle Studio (database GUI) |

### Using Database in Packages

```typescript
import { Hono } from 'hono';
import { createDbMiddleware } from '@kagaribi/core';
import { getDb, initDb, schema } from '../../../db/index.js';

const app = new Hono()
  // Auto-initialize database connection
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

**`createDbMiddleware()` automatically:**
- Reads `DATABASE_URL` from environment
  - Node.js: `process.env.DATABASE_URL`
  - Cloudflare Workers: `c.env.DATABASE_URL`
- Calls `initDb()` on first request
- Ensures idempotent initialization (won't initialize twice)

---

## Nested Routing

Define cross-package route patterns:

```typescript
// packages/articles/kagaribi.package.ts
export default definePackage({
  name: 'articles',
  dependencies: ['users'],
  routes: ['/users/:userId/articles'],
});
```

Access route parameters via middleware:

```typescript
import { kagaribiParamsMiddleware } from '@kagaribi/core';

app.use('*', kagaribiParamsMiddleware());

app.get('/', (c) => {
  const userId = c.get('userId' as never) as string;
  return c.json({ userId, articles: [] });
});

app.get('/:articleId', (c) => {
  const userId = c.get('userId' as never) as string;
  const articleId = c.req.param('articleId');
  return c.json({ userId, articleId, title: 'Article' });
});
```

---

## Framework Packages

| Package | Description |
|---------|-------------|
| [@kagaribi/core](./packages/core) | Core library (config, RPC, proxy, build) |
| [@kagaribi/cli](./packages/cli) | CLI tool (init, dev, new, build, deploy) |

## Documentation

- [Usage Guide (English)](./USAGE.md) - Comprehensive documentation with advanced patterns
- [README (Japanese)](./README.ja.md) - 日本語版README

## License

[MIT](./LICENSE)
