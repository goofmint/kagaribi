---
name: deployment
description: Build and deploy Kagaribi packages to cloud platforms with automatic URL tracking
---

# Deployment Skill

Guide Claude through building and deploying Kagaribi packages to production
environments.

## Build Process

```bash
npx kagaribi build [--env environment]
```

**Examples:**
```bash
npx kagaribi build                    # Default environment
npx kagaribi build --env production   # Production environment
npx kagaribi build --env staging      # Staging environment
```

**Output:**
```
dist/
  root/
    index.js          # Bundled application
    wrangler.toml     # (Cloudflare Workers only)
    Dockerfile        # (Google Cloud Run only)
  users/
    index.js
    ...
```

## Deployment Model

Kagaribi's deployment model enables **independent deployment per package**.

### Independent Package Deployment

Each package can be **deployed individually to different FaaS platforms**:

- `users` → Cloudflare Workers (fast edge response)
- `payments` → AWS Lambda (integration with existing AWS infrastructure)
- `analytics` → Google Cloud Run (suitable for batch processing)
- `notifications` → Deno Deploy (lightweight notification processing)

### Only Root Package Knows Deployment Locations

**Critical design principle:**
- Packages don't know where they are deployed
- Packages don't know where other packages are deployed
- Only root package references `url` field in `kagaribi.config.ts` and connects to appropriate URLs

**Why this design?**
1. **Package independence**: Package code doesn't depend on deployment destination
2. **Flexibility**: Changing deployment destination doesn't require changing package code
3. **Environment switching**: Can use different deployment destinations for dev/staging/production

### Automatic RPC Communication Switching

`getClient<T>()` **automatically switches communication method based on deployment configuration**:

1. **Co-location (same process)**
   - Direct function calls
   - No HTTP requests
   - Low latency

2. **Distributed deployment (different FaaS)**
   - HTTP RPC communication
   - Uses `url` from `kagaribi.config.ts`
   - Package code requires no changes

**Packages don't need to be aware of communication method.**

### DB Connection Model

Each package **establishes its own DB connection**.

#### Co-location (Same Process)

Root package executes `initDb()`, and all packages use same DB connection via `getDb()`:

```typescript
// packages/root/src/index.ts
import { createDbMiddleware } from '@kagaribi/core';
import { initDb } from '../../../db/index.js';

const app = new Hono()
  .use('*', createDbMiddleware({ initFn: initDb }));
```

Other packages simply call `getDb()`:

```typescript
// packages/users/src/index.ts
import { getDb, schema } from '../../../db/index.js';

app.get('/api/users', async (c) => {
  const db = getDb();  // Use connection initialized by root
  const users = await db.select().from(schema.users);
  return c.json(users);
});
```

#### Distributed Deployment (Different FaaS)

Each package **independently** establishes DB connection using `createDbMiddleware()`:

```typescript
// packages/users/src/index.ts (deployed to Cloudflare Workers)
import { createDbMiddleware } from '@kagaribi/core';
import { initDb, getDb, schema } from '../../../db/index.js';

const app = new Hono()
  // Auto-initialize with middleware
  .use('*', createDbMiddleware({ initFn: initDb }))

  .get('/api/users', async (c) => {
    const db = getDb();
    const users = await db.select().from(schema.users);
    return c.json(users);
  });
```

**Connection string management via environment variables:**
- Set `DATABASE_URL` environment variable at each deployment destination
- `createDbMiddleware()` automatically reads environment variable
- Node.js: `process.env.DATABASE_URL`
- Cloudflare Workers: `c.env.DATABASE_URL` (via bindings)

**Important:** All packages connect to the same database, but connections are established individually per package.

## Deployment Modes

### Dry-Run Mode (Default)

Without explicit target or environment flags, shows deployment instructions:

```bash
npx kagaribi deploy
npx kagaribi deploy users
npx kagaribi deploy --dry-run
```

**Output:** Platform-specific commands and setup instructions (does not deploy).

### Actual Deployment

Specify target platform or environment to perform actual deployment:

```bash
# Deploy specific package to target
npx kagaribi deploy users --cloudflare
npx kagaribi deploy payments --lambda
npx kagaribi deploy api --cloudrun

# Deploy all undeployed packages to target
npx kagaribi deploy --cloudflare
npx kagaribi deploy --lambda

# Deploy using environment configuration
npx kagaribi deploy --env production
npx kagaribi deploy --env staging
```

After successful deployment, `kagaribi.config.ts` is **automatically updated**
with the deployed URL.

## Platform-Specific Requirements

### Cloudflare Workers

**Required tool:** `wrangler`

```bash
npm install -g wrangler
wrangler login
```

**Deploy command:**
```bash
kagaribi deploy users --cloudflare
```

**What happens:**
- Generates `dist/users/wrangler.toml`
- Runs `wrangler deploy` from `dist/users/`
- Updates `kagaribi.config.ts` with deployed URL

**Environment variables:**
Configure in `wrangler.toml`:
```toml
[env.production.vars]
DATABASE_URL = "postgresql://..."
```

### AWS Lambda

**Required tool:** `aws` CLI
**Required environment variable:** `AWS_LAMBDA_ROLE_ARN`

```bash
# Install AWS CLI
brew install awscli  # or appropriate package manager
aws configure

# Set Lambda execution role ARN
export AWS_LAMBDA_ROLE_ARN=arn:aws:iam::123456789012:role/lambda-execution-role
```

**Deploy command:**
```bash
kagaribi deploy payments --lambda
```

**What happens:**
- Creates Lambda function (or updates if exists)
- Uploads bundled code from `dist/payments/index.js`
- Updates `kagaribi.config.ts` with function URL
- Configures Node.js 22.x runtime

**Environment variables:**
```bash
aws lambda update-function-configuration \
  --function-name payments \
  --environment Variables={DATABASE_URL=postgresql://...}
```

### Google Cloud Run

**Required tool:** `gcloud` CLI
**Required environment variable:** `CLOUD_RUN_REGION` (optional, defaults to `us-central1`)

```bash
# Install gcloud CLI
brew install google-cloud-sdk
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Set region (optional)
export CLOUD_RUN_REGION=asia-northeast1
```

**Deploy command:**
```bash
kagaribi deploy api --cloudrun
```

**What happens:**
- Generates `dist/api/Dockerfile`
- Builds container image with Cloud Build
- Deploys to Cloud Run in specified region
- Updates `kagaribi.config.ts` with service URL

**Environment variables:**
```bash
gcloud run services update api \
  --set-env-vars DATABASE_URL=postgresql://...
```

### Deno Deploy

**Required tool:** `deployctl`

```bash
npm install -g deployctl
```

**Deploy command:**
```bash
kagaribi deploy notifications --deno
```

**What happens:**
- Uploads `dist/notifications/index.js` to Deno Deploy
- Creates or updates deployment
- Updates `kagaribi.config.ts` with deployed URL

### Node.js (Manual Deployment)

**No special tools required** - Use your preferred deployment method.

```bash
kagaribi build --env production
```

**Deploy to server:**
```bash
# Copy dist/ directory to server
scp -r dist/ user@server:/app/

# On server, run with Node.js
cd /app/dist/root
node index.js
```

**With PM2:**
```bash
pm2 start dist/root/index.js --name my-app
pm2 save
```

**With systemd:**
Create `/etc/systemd/system/my-app.service`:
```ini
[Unit]
Description=Kagaribi App

[Service]
ExecStart=/usr/bin/node /app/dist/root/index.js
WorkingDirectory=/app/dist/root
Restart=always
Environment=DATABASE_URL=postgresql://...

[Install]
WantedBy=multi-user.target
```

## Co-location Strategy

**Co-location** bundles multiple packages into a single deployment for simpler
infrastructure.

### Configuration

```typescript
// kagaribi.config.ts
export default defineConfig({
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
      url: 'https://payments.example.com',
    },
  },
});
```

**Benefits:**
- Fewer deployments to manage
- Lower infrastructure costs
- Reduced latency between co-located packages
- Simpler authentication/authorization

**When to use:**
- Development environment (all packages together)
- Small-to-medium projects
- Packages with tight coupling
- Cost optimization

**When to deploy separately:**
- Different scaling requirements
- Different geographic regions needed
- Security isolation required
- Team-based ownership boundaries

## Automatic URL Management

After deployment, `kagaribi.config.ts` is automatically updated:

**Before deployment:**
```typescript
export default defineConfig({
  packages: {
    users: {
      target: 'cloudflare-workers',
    },
  },
});
```

**After `kagaribi deploy users --cloudflare`:**
```typescript
export default defineConfig({
  packages: {
    users: {
      target: 'cloudflare-workers',
      url: 'https://users.your-project.workers.dev',  // Auto-added
    },
  },
});
```

This enables:
- Automatic service discovery for RPC calls
- Environment-specific URL management
- No manual configuration updates needed

## Environment-Based Deployment

Define multiple environments in `kagaribi.config.ts`:

```typescript
export default defineConfig({
  packages: {
    root: { target: 'node' },
  },
  environments: {
    development: {
      packages: {
        '*': { colocateWith: 'root' },  // All local
      },
    },
    staging: {
      packages: {
        users: {
          target: 'cloudflare-workers',
          url: '$STAGING_USERS_URL',
        },
        payments: {
          target: 'aws-lambda',
          url: '$STAGING_PAYMENTS_URL',
        },
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

**Deploy to specific environment:**
```bash
# Set environment variables
export PROD_USERS_URL=https://users.prod.example.com
export PROD_PAYMENTS_URL=https://payments.prod.example.com

# Deploy
kagaribi deploy --env production
```

## Database Deployment

### Environment Variables

Set `DATABASE_URL` for each platform:

**Cloudflare Workers (`wrangler.toml`):**
```toml
[env.production.vars]
DATABASE_URL = "postgresql://user:pass@host/db"
```

**AWS Lambda:**
```bash
aws lambda update-function-configuration \
  --function-name my-function \
  --environment Variables={DATABASE_URL=postgresql://...}
```

**Google Cloud Run:**
```bash
gcloud run services update my-service \
  --set-env-vars DATABASE_URL=postgresql://...
```

**Node.js (`.env` or environment):**
```bash
export DATABASE_URL=postgresql://user:pass@host:5432/db
node dist/root/index.js
```

### Running Migrations

Run migrations **before** deploying application code:

```bash
# Local or CI/CD environment
pnpm run db:migrate
```

**In CI/CD:**
```yaml
# Example: GitHub Actions
- name: Run migrations
  run: pnpm run db:migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

- name: Deploy
  run: kagaribi deploy --env production
```

## Deployment Workflow Example

### Scenario: Deploy to Production

1. **Build the project:**
   ```bash
   kagaribi build --env production
   ```

2. **Deploy packages:**
   ```bash
   # Deploy users to Cloudflare Workers
   kagaribi deploy users --cloudflare

   # Deploy payments to AWS Lambda
   export AWS_LAMBDA_ROLE_ARN=arn:aws:iam::123456789012:role/lambda-role
   kagaribi deploy payments --lambda

   # Deploy API to Google Cloud Run
   export CLOUD_RUN_REGION=us-central1
   kagaribi deploy api --cloudrun
   ```

3. **Verify deployments:**
   ```bash
   curl https://users.your-project.workers.dev/health
   curl https://payments-xyz.lambda-url.us-east-1.on.aws/health
   curl https://api-xyz.run.app/health
   ```

4. **Check configuration:**
   ```bash
   cat kagaribi.config.ts
   # Verify URLs are auto-updated
   ```

## Best Practices

1. **Test locally first** - Run `npx kagaribi dev` before deploying
2. **Use environments** - Define staging and production configurations
3. **Secure secrets** - Use environment variables, never commit credentials
4. **Deploy incrementally** - Deploy to staging before production
5. **Monitor health** - Include `/health` endpoints in all packages
6. **Co-locate wisely** - Bundle related packages, split when scaling needs differ
7. **Run migrations first** - Apply database changes before code deployment

## Troubleshooting

**Issue:** Authentication error during deployment
- **Solution:** Ensure CLI tool is authenticated (`wrangler login`, `aws configure`, `gcloud auth login`)

**Issue:** AWS Lambda deployment fails with missing role
- **Solution:** Set `AWS_LAMBDA_ROLE_ARN` environment variable

**Issue:** Cloud Run deployment fails
- **Solution:** Verify project ID with `gcloud config get-value project`

**Issue:** RPC calls to deployed package fail
- **Solution:** Check `url` in `kagaribi.config.ts` and verify service is running

**Issue:** Database connection fails in production
- **Solution:** Verify `DATABASE_URL` is correctly set for the deployment platform

## Next Steps

After deployment:
- Monitor logs and performance
- Set up alerts for errors
- Configure autoscaling if needed
- Implement rollback strategy
- Refer to [USAGE.md](../../../USAGE.md) for advanced deployment patterns
