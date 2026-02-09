# kagaribi - Usage Guide

kagaribi is a Hono-based microservices framework that lets you develop packages locally in a monorepo and deploy them to different targets (Cloudflare Workers, AWS Lambda, Google Cloud Run, Deno Deploy, or Node.js).

## Prerequisites

- Node.js >= 22.6.0
- pnpm

## Project Structure

```
my-project/
  kagaribi.config.ts          # Deployment configuration
  packages/
    root/                     # Entry point package (required)
      kagaribi.package.ts
      src/index.ts
    auth/
      kagaribi.package.ts
      src/index.ts
    users/
      kagaribi.package.ts
      src/index.ts
  pnpm-workspace.yaml
  package.json
```

## CLI Commands

### `kagaribi init <name> [target flag]`

Initialize a new kagaribi project. Creates the project directory with all necessary files and a root package.

```bash
# Create a new project (default target: node)
kagaribi init my-project

# Create a project with a specific root target
kagaribi init my-project --cloudflare
kagaribi init my-project --node
```

This generates:

- `package.json` - Project dependencies and scripts
- `kagaribi.config.ts` - Configuration with root package
- `tsconfig.json` - TypeScript configuration
- `.gitignore` - Ignore patterns (node_modules, dist, .kagaribi)
- `packages/root/kagaribi.package.ts` - Root package manifest
- `packages/root/src/index.ts` - Minimal Hono app with `GET /` and `GET /health`

After creation, you'll be prompted to install dependencies with `pnpm install`.

### `kagaribi dev [port]`

Start the development server. All packages run in a single process with local routing.

```bash
kagaribi dev        # http://localhost:3000
kagaribi dev 8080   # http://localhost:8080
```

### `kagaribi new <name> [target flag]`

Create a new package with scaffolding files and update `kagaribi.config.ts`.

```bash
# Create a package co-located with root (default)
kagaribi new payments

# Create a package targeting a specific platform
kagaribi new payments --cloudflare
kagaribi new payments --lambda
kagaribi new payments --cloudrun
kagaribi new payments --deno
kagaribi new payments --node
```

This generates:

- `packages/<name>/kagaribi.package.ts` - Package manifest
- `packages/<name>/src/index.ts` - Hono app template
- Updates `kagaribi.config.ts` with the new package entry

### `kagaribi build [--env name]`

Build the project for deployment. Generates bundled output in `dist/`.

```bash
kagaribi build                  # Default environment
kagaribi build --env production # Production environment
```

### `kagaribi deploy [pkg] [target flag] [--env name]`

Deploy packages to their target platforms.

```bash
# Show deploy instructions (dry-run, no --target or --env)
kagaribi deploy

# Deploy a specific package to a target
kagaribi deploy users --cloudrun
kagaribi deploy users --lambda
kagaribi deploy auth --cloudflare

# Deploy all undeployed packages to a target
kagaribi deploy --cloudflare

# Deploy using environment config
kagaribi deploy --env production

# Explicit dry-run
kagaribi deploy --dry-run
```

After deployment, `kagaribi.config.ts` is automatically updated with the deployed URL so other packages know where to reach the deployed service.

## Configuration

### kagaribi.config.ts

```typescript
import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    root: {
      target: 'node',
    },
    auth: {
      colocateWith: 'root',  // Bundled with root
    },
    users: {
      colocateWith: 'root',
    },
  },
  environments: {
    development: {
      packages: {
        '*': { colocateWith: 'root' },  // All local in dev
      },
    },
    production: {
      packages: {
        users: {
          target: 'aws-lambda',
          url: '$USERS_URL',  // Environment variable reference
        },
      },
    },
  },
});
```

**Package options:**

| Field | Description |
|-------|-------------|
| `target` | Deploy target: `'node'`, `'cloudflare-workers'`, `'aws-lambda'`, `'google-cloud-run'`, `'deno'` |
| `colocateWith` | Bundle with another package (e.g., `'root'`) |
| `url` | Remote URL. Use `$ENV_VAR` for environment variable references |

### kagaribi.package.ts

```typescript
import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'users',
  dependencies: ['auth'],                          // Other kagaribi packages this depends on
  routes: ['/users/:userId/articles'],              // Nested routing patterns
  runtime: ['node', 'cloudflare-workers', 'deno'],  // Compatible runtimes
});
```

## Writing Packages

Each package exports a Hono app:

```typescript
import { Hono } from 'hono';

const app = new Hono()
  .get('/api/items', (c) => c.json({ items: [] }))
  .get('/api/items/:id', (c) => {
    const id = c.req.param('id');
    return c.json({ id });
  });

export type ItemsApp = typeof app;  // Export type for RPC
export default app;
```

## Inter-Package Communication (RPC)

Call other packages with full type safety using `getClient()`:

```typescript
import { getClient } from '@kagaribi/core';
import type { UsersApp } from '../../users/src/index.js';

const users = getClient<UsersApp>('users');
const res = await users.api.users.$get();
const data = await res.json();
```

This works identically whether the target package is local (co-located) or remote (deployed separately). The framework handles routing transparently.

## Nested Routing

Packages can define nested route patterns:

```typescript
// packages/articles/kagaribi.package.ts
export default definePackage({
  name: 'articles',
  dependencies: ['users'],
  routes: ['/users/:userId/articles'],
});
```

Path parameters are extracted and forwarded via the `X-Kagaribi-Params` header. Use the middleware to access them:

```typescript
import { Hono } from 'hono';
import { kagaribiParamsMiddleware } from '@kagaribi/core';

const app = new Hono();
app.use('*', kagaribiParamsMiddleware());

app.get('/', (c) => {
  const userId = c.get('userId' as never) as string;
  return c.json({ userId, articles: [] });
});
```

## Deploy Targets

| Target | Flag | CLI Tool Required |
|--------|------|-------------------|
| Cloudflare Workers | `--cloudflare` | `wrangler` |
| AWS Lambda | `--lambda` | `aws` CLI |
| Google Cloud Run | `--cloudrun` | `gcloud` CLI |
| Deno Deploy | `--deno` | `deployctl` |
| Node.js | `--node` | None (manual deploy) |

## Build Output

```
dist/
  root/
    index.js          # Bundled app
    wrangler.toml     # (Cloudflare only)
    Dockerfile        # (Cloud Run only)
  users/
    index.js
```

## Environment Variables

Use `$VAR_NAME` in the config to reference environment variables:

```typescript
users: {
  target: 'aws-lambda',
  url: '$USERS_URL',  // Reads process.env.USERS_URL at runtime
}
```

For Cloudflare Workers targets, environment variables must be configured as bindings in `wrangler.toml` rather than using `$VAR_NAME`.
