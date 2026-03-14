# Configuration Reference - Kagaribi

Comprehensive reference for Kagaribi configuration files and options.

## kagaribi.config.ts

Main configuration file at project root. Defines deployment strategy, package
relationships, and environment-specific settings.

### File Structure

```typescript
import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    // Package configurations
  },
  environments: {
    // Environment-specific configurations
  },
  db: {
    // Database configuration (optional)
  },
});
```

## `packages` Configuration

Defines all packages in your project and their deployment settings.

### Package Options

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `target` | `string` | Deployment platform | `'node'`, `'cloudflare-workers'`, `'aws-lambda'`, `'google-cloud-run'`, `'deno'` |
| `colocateWith` | `string` | Bundle with another package | `'root'` |
| `url` | `string` | Remote URL or env var reference | `'https://api.example.com'`, `'$API_URL'` |

### Example: Basic Package Configuration

```typescript
export default defineConfig({
  packages: {
    root: {
      target: 'node',  // Deploy to Node.js
    },
    auth: {
      colocateWith: 'root',  // Bundle with root package
    },
    users: {
      target: 'aws-lambda',  // Deploy separately to Lambda
      url: 'https://users-api.example.com',  // Deployed URL
    },
  },
});
```

### Target Values

| Target | Description | Use Case |
|--------|-------------|----------|
| `node` | Traditional Node.js server | VPS, dedicated servers, containerized apps |
| `cloudflare-workers` | Cloudflare Workers (edge) | Global CDN, low-latency edge computing |
| `aws-lambda` | AWS Lambda (serverless) | Event-driven, pay-per-use, AWS ecosystem |
| `google-cloud-run` | Google Cloud Run (containers) | Containerized serverless, GCP ecosystem |
| `deno` | Deno Deploy (edge) | TypeScript-first edge runtime |

### Co-location Strategy

Bundle multiple packages into a single deployment:

```typescript
packages: {
  root: {
    target: 'node',
  },
  auth: {
    colocateWith: 'root',  // Bundled with root
  },
  users: {
    colocateWith: 'root',  // Bundled with root
  },
  payments: {
    target: 'aws-lambda',  // Deployed separately
  },
}
```

**Benefits:**
- Fewer deployments to manage
- Lower infrastructure costs
- Reduced inter-package latency
- Simpler local development

**When to deploy separately:**
- Different scaling requirements
- Different geographic regions
- Security isolation needed
- Team-based ownership

## `environments` Configuration

Define environment-specific settings that override base configuration.

### Structure

```typescript
environments: {
  development: {
    packages: {
      // Development overrides
    },
  },
  staging: {
    packages: {
      // Staging overrides
    },
  },
  production: {
    packages: {
      // Production overrides
    },
  },
}
```

### Example: Multi-Environment Setup

```typescript
export default defineConfig({
  packages: {
    root: { target: 'node' },
    users: { target: 'aws-lambda' },
    payments: { target: 'aws-lambda' },
  },
  environments: {
    development: {
      packages: {
        '*': { colocateWith: 'root' },  // All packages run locally
      },
    },
    staging: {
      packages: {
        users: {
          target: 'aws-lambda',
          url: '$STAGING_USERS_URL',  // Staging URL from env var
        },
        payments: {
          colocateWith: 'root',  // Keep with root in staging
        },
      },
    },
    production: {
      packages: {
        users: {
          target: 'aws-lambda',
          url: '$PROD_USERS_URL',  // Production URL from env var
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

### Wildcard Pattern

Use `'*'` to apply settings to all packages:

```typescript
environments: {
  development: {
    packages: {
      '*': { colocateWith: 'root' },  // All packages bundled in dev
    },
  },
}
```

## `db` Configuration

Database settings (optional, only if using `--db` flag).

### Options

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `dialect` | `string` | Database type | `'postgresql'`, `'mysql'` |

### Example

```typescript
export default defineConfig({
  packages: {
    // ...
  },
  db: {
    dialect: 'postgresql',
  },
});
```

## kagaribi.package.ts

Package manifest file located in each package directory (`packages/<name>/kagaribi.package.ts`).

### File Structure

```typescript
import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'users',
  dependencies: ['auth'],
  routes: ['/users/:userId/posts'],
  runtime: ['node', 'cloudflare-workers', 'deno'],
});
```

### Fields

#### `name` (required)

Package identifier. Must match directory name.

```typescript
export default definePackage({
  name: 'users',  // Must match packages/users/
});
```

#### `dependencies` (optional)

Array of other Kagaribi packages this package depends on.

```typescript
export default definePackage({
  name: 'articles',
  dependencies: ['users', 'auth'],  // Requires users and auth packages
});
```

**Usage:**
- Lists packages that this package calls via RPC
- Ensures correct initialization order
- Documents package relationships

**Example dependency chain:**
```typescript
// packages/auth/kagaribi.package.ts
export default definePackage({
  name: 'auth',
  dependencies: [],  // No dependencies
});

// packages/users/kagaribi.package.ts
export default definePackage({
  name: 'users',
  dependencies: ['auth'],  // Depends on auth
});

// packages/articles/kagaribi.package.ts
export default definePackage({
  name: 'articles',
  dependencies: ['users'],  // Depends on users (and transitively auth)
});
```

#### `routes` (optional)

Array of custom route patterns for nested routing.

```typescript
export default definePackage({
  name: 'articles',
  routes: [
    '/users/:userId/articles',      // Handle user-specific articles
    '/categories/:categoryId/posts', // Handle category-specific posts
  ],
});
```

**Usage:**
- Enables nested URL patterns across packages
- Parameters are extracted and forwarded via `X-Kagaribi-Params` header
- Access parameters with `kagaribiParamsMiddleware()`

**Example in package code:**

```typescript
import { Hono } from 'hono';
import { kagaribiParamsMiddleware } from '@kagaribi/core';

const app = new Hono();

app.use('*', kagaribiParamsMiddleware());

app.get('/', (c) => {
  const userId = c.get('userId' as never) as string;  // From /users/:userId/articles
  return c.json({ userId, articles: [] });
});
```

#### `runtime` (optional)

Array of compatible deployment targets.

```typescript
export default definePackage({
  name: 'users',
  runtime: ['node', 'cloudflare-workers', 'deno'],
});
```

**Possible values:**
- `'node'` - Node.js environment
- `'cloudflare-workers'` - Cloudflare Workers edge runtime
- `'aws-lambda'` - AWS Lambda serverless
- `'google-cloud-run'` - Google Cloud Run containers
- `'deno'` - Deno runtime

**Usage:**
- Documents which platforms the package supports
- Helps validate deployment configurations
- Useful for packages with platform-specific code

## Environment Variable Patterns

### Using `$VAR_NAME` Syntax

Reference environment variables in `kagaribi.config.ts`:

```typescript
packages: {
  users: {
    target: 'aws-lambda',
    url: '$USERS_URL',  // Reads process.env.USERS_URL at runtime
  },
}
```

**At runtime:**

```bash
export USERS_URL=https://users.example.com
kagaribi dev
```

**In production:**

```bash
export PROD_USERS_URL=https://users.prod.example.com
kagaribi deploy --env production
```

### Environment-Specific URLs

```typescript
environments: {
  staging: {
    packages: {
      users: {
        url: '$STAGING_USERS_URL',
      },
    },
  },
  production: {
    packages: {
      users: {
        url: '$PROD_USERS_URL',
      },
    },
  },
}
```

**Setup:**

```bash
# Staging
export STAGING_USERS_URL=https://users.staging.example.com

# Production
export PROD_USERS_URL=https://users.prod.example.com
```

### Database URLs

```bash
# .env file
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

**Usage in code:**

```typescript
import { createDbMiddleware } from '@kagaribi/core';
import { initDb } from '../../../db/index.js';

app.use('*', createDbMiddleware({ initFn: initDb }));
// Automatically reads DATABASE_URL from environment
```

## Complete Configuration Examples

### Example 1: Simple Monolith

Everything co-located in development and production:

```typescript
export default defineConfig({
  packages: {
    root: { target: 'node' },
    auth: { colocateWith: 'root' },
    users: { colocateWith: 'root' },
    posts: { colocateWith: 'root' },
  },
});
```

### Example 2: Microservices Architecture

Separate deployments for each service:

```typescript
export default defineConfig({
  packages: {
    root: {
      target: 'node',
      url: 'https://api.example.com',
    },
    auth: {
      target: 'cloudflare-workers',
      url: '$AUTH_URL',
    },
    users: {
      target: 'aws-lambda',
      url: '$USERS_URL',
    },
    payments: {
      target: 'aws-lambda',
      url: '$PAYMENTS_URL',
    },
  },
});
```

### Example 3: Hybrid Approach

Some packages co-located, others separate:

```typescript
export default defineConfig({
  packages: {
    root: { target: 'node' },
    auth: { colocateWith: 'root' },
    users: { colocateWith: 'root' },
    payments: {
      target: 'aws-lambda',  // Separate for security/compliance
      url: '$PAYMENTS_URL',
    },
    analytics: {
      target: 'google-cloud-run',  // Separate for heavy processing
      url: '$ANALYTICS_URL',
    },
  },
});
```

### Example 4: Progressive Deployment

Start co-located, split in production:

```typescript
export default defineConfig({
  packages: {
    root: { target: 'node' },
    auth: { colocateWith: 'root' },
    users: { colocateWith: 'root' },
    payments: { colocateWith: 'root' },
  },
  environments: {
    development: {
      packages: {
        '*': { colocateWith: 'root' },  // All together in dev
      },
    },
    production: {
      packages: {
        users: {
          target: 'aws-lambda',  // Split out in production
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

## Best Practices

1. **Start simple** - Begin with all packages co-located
2. **Use environments** - Define development, staging, production
3. **Environment variables for URLs** - Use `$VAR_NAME` syntax for flexibility
4. **Document dependencies** - Always list package dependencies accurately
5. **Match runtime to platform** - Ensure package code is compatible with target
6. **Test locally first** - Verify configuration with `kagaribi dev`
7. **Validate before deploy** - Use `kagaribi deploy --dry-run`

## Configuration Validation

Check configuration validity:

```bash
# Dry-run to see what would be deployed
kagaribi deploy --dry-run

# Build to validate configuration
kagaribi build

# Test locally
kagaribi dev
```

## Troubleshooting

**Issue:** Package not found during RPC call
- **Check:** Package listed in `dependencies` array in `kagaribi.package.ts`

**Issue:** Wrong URL used for remote package
- **Check:** Environment variable is set correctly
- **Check:** Using correct environment flag (`--env`)

**Issue:** Package fails to deploy to target
- **Check:** `runtime` array includes target platform
- **Check:** Package code is compatible with platform

**Issue:** Configuration not taking effect
- **Check:** Correct syntax in `kagaribi.config.ts`
- **Check:** Restart dev server after config changes
- **Check:** Rebuild after config changes (`kagaribi build`)

## Related Documentation

- Development workflow → `.claude/skills/development/SKILL.md`
- Deployment strategies → `.claude/skills/deployment/SKILL.md`
- Database configuration → `.claude/skills/development/references/database.md`
- Basic example → `examples/basic/CLAUDE.md`
