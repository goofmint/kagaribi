---
name: project-setup
description: Initialize new Kagaribi projects with optional database and deployment target configuration
---

# Project Setup Skill

Guide Claude through initializing a new Kagaribi project with appropriate
configuration based on user requirements.

## Interactive Decision Flow

When a user wants to create a new project, gather these requirements:

1. **Project name/purpose** - What is the project for? (e.g., "blog API", "e-commerce backend")
2. **Database requirements**:
   - None (API without persistence)
   - PostgreSQL (recommended for most projects)
   - MySQL (if specifically required)
3. **Deployment target** (can be changed later):
   - `node` - Traditional Node.js servers, VPS (default)
   - `cloudflare` - Cloudflare Workers (edge computing)
   - `lambda` - AWS Lambda (serverless)
   - `cloudrun` - Google Cloud Run (containers)
   - `deno` - Deno Deploy (edge runtime)

## Command Syntax

```bash
kagaribi init <name> [--db postgresql|mysql] [--node|--cloudflare|--lambda|--cloudrun|--deno]
```

**Examples:**
```bash
# Basic project with Node.js target (default)
kagaribi init my-api

# Project with PostgreSQL database
kagaribi init blog-api --db postgresql

# Project with MySQL and Cloudflare Workers target
kagaribi init shop-api --db mysql --cloudflare

# Project without database, targeting AWS Lambda
kagaribi init webhook-handler --lambda
```

## Generated Files

### All Projects
- `package.json` - Dependencies and scripts
- `kagaribi.config.ts` - Deployment configuration
- `tsconfig.json` - TypeScript configuration
- `.gitignore` - Standard ignore patterns
- `pnpm-workspace.yaml` - pnpm workspace configuration
- `packages/root/kagaribi.package.ts` - Root package manifest
- `packages/root/src/index.ts` - Minimal Hono app with `/` and `/health` routes

### With `--db` Flag
- `db/schema.ts` - Drizzle ORM schema definitions
- `db/index.ts` - Database connection helper (`initDb`, `getDb`)
- `db/models/index.ts` - Model exports
- `drizzle.config.ts` - Drizzle Kit configuration
- `.env.example` - Environment variable template
- Additional scripts: `build:db`, `db:generate`, `db:migrate`, `db:studio`

## Post-Initialization Steps

### 1. Install Dependencies

```bash
cd <project-name>
pnpm install
```

### 2. Environment Setup (Database Projects Only)

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and set DATABASE_URL
# PostgreSQL example: postgresql://user:password@localhost:5432/dbname
# MySQL example: mysql://user:password@localhost:3306/dbname
```

### 3. Database Migration (Database Projects Only)

```bash
# Generate migration files from schema
pnpm run db:generate

# Apply migrations to database
pnpm run db:migrate
```

### 4. Start Development Server

```bash
pnpm run dev
# Server starts at http://localhost:3000
```

## Common Scenarios

### Scenario 1: API-Only Project (No Database)

**User requirement:** "Create a simple REST API for webhooks"

**Commands:**
```bash
kagaribi init webhook-api --node
cd webhook-api
pnpm install
pnpm run dev
```

**What you get:**
- Basic Hono app ready for route definitions
- No database dependencies
- Node.js deployment target

### Scenario 2: Full-Stack API with PostgreSQL

**User requirement:** "Build a blog backend with PostgreSQL"

**Commands:**
```bash
kagaribi init blog-api --db postgresql --node
cd blog-api
pnpm install
cp .env.example .env
# Edit .env: DATABASE_URL=postgresql://user:pass@localhost:5432/blog
pnpm run db:generate
pnpm run db:migrate
pnpm run dev
```

**What you get:**
- Hono app with database middleware
- PostgreSQL schema setup with Drizzle ORM
- Database helper functions (`getDb()`, `initDb()`)
- Migration scripts ready to use

### Scenario 3: Serverless API with MySQL

**User requirement:** "Create a serverless API on Cloudflare Workers with MySQL"

**Commands:**
```bash
kagaribi init serverless-api --db mysql --cloudflare
cd serverless-api
pnpm install
cp .env.example .env
# Edit .env: DATABASE_URL=mysql://user:pass@host:3306/dbname
pnpm run db:generate
pnpm run db:migrate
pnpm run dev
```

**What you get:**
- Cloudflare Workers-compatible setup
- MySQL schema with Drizzle ORM
- Environment configured for edge runtime

## Key Configuration Files

### `kagaribi.config.ts`

```typescript
import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    root: {
      target: 'node',  // Deployment target
    },
  },
  environments: {
    development: {
      packages: {
        '*': { colocateWith: 'root' },  // All packages run together
      },
    },
    production: {
      packages: {
        // Define production deployment strategy
      },
    },
  },
});
```

### `db/schema.ts` (with `--db`)

```typescript
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Example table (auto-generated)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### `db/index.ts` (with `--db`)

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { createDbHelper } from '@kagaribi/core';
import * as schema from './schema.js';

const { initDb, getDb } = createDbHelper((url) => drizzle(url, { schema }));

export { initDb, getDb, schema };
```

## Troubleshooting

**Issue:** `pnpm install` fails
- **Solution:** Ensure Node.js >= 22.6.0 and pnpm are installed

**Issue:** Database connection fails
- **Solution:** Verify `DATABASE_URL` format and database server is running

**Issue:** Migration generation fails
- **Solution:** Check `db/schema.ts` for syntax errors

## Next Steps

After successful project initialization:
- Use the **development skill** to create packages and add features
- Refer to [USAGE.md](../../../USAGE.md) for detailed documentation
