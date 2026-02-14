# Basic Example Project - Claude Development Guide

This is a basic Kagaribi project demonstrating multi-package architecture with
inter-package dependencies and nested routing.

## Project Overview

A simple blog-like application with three independent packages:
- **auth** - Authentication and authorization
- **users** - User management
- **articles** - Article management with user-specific routes

## Package Structure

```
packages/
├── root/              # Entry point package
│   ├── kagaribi.package.ts
│   └── src/index.ts
├── auth/              # Authentication package
│   ├── kagaribi.package.ts
│   └── src/index.ts
├── users/             # User management package (depends on auth)
│   ├── kagaribi.package.ts
│   └── src/index.ts
└── articles/          # Article management package (depends on users)
    ├── kagaribi.package.ts
    └── src/index.ts
```

## Package Dependencies

This project demonstrates a dependency chain:

```
auth (no dependencies)
  ↓
users (depends on auth)
  ↓
articles (depends on users)
```

**Why this structure?**
- `auth` is independent - provides authentication tokens and validation
- `users` depends on `auth` - needs to verify user identity before CRUD operations
- `articles` depends on `users` - needs user information to associate articles with authors

## Deployment Configuration

See `kagaribi.config.ts` for deployment settings:

```typescript
export default defineConfig({
  packages: {
    root: { target: 'node' },
    auth: { colocateWith: 'root' },      // Bundled with root
    users: { colocateWith: 'root' },     // Bundled with root
    articles: { colocateWith: 'root' },  // Bundled with root
  },
  environments: {
    development: {
      packages: {
        '*': { colocateWith: 'root' },  // All packages run together
      },
    },
    production: {
      packages: {
        users: {
          target: 'aws-lambda',  // Deploy users separately
          url: '$USERS_URL',     // Environment variable reference
        },
      },
    },
  },
});
```

**Key points:**
- Development: All packages co-located for fast iteration
- Production: `users` can be deployed separately to AWS Lambda
- Other packages remain co-located with `root`

## Nested Routing

The `articles` package demonstrates nested routing:

```typescript
// packages/articles/kagaribi.package.ts
export default definePackage({
  name: 'articles',
  dependencies: ['users'],
  routes: ['/users/:userId/articles'],  // Handle user-specific articles
});
```

This allows URLs like:
- `GET /users/123/articles` - List articles for user 123
- `GET /users/123/articles/456` - Get specific article

## Development Workflow

### Start Development Server
```bash
pnpm run dev
# All packages run at http://localhost:3000
```

### Test Inter-Package Communication
```bash
# Test auth package
curl http://localhost:3000/auth/login

# Test users package (calls auth internally)
curl http://localhost:3000/users

# Test articles package (calls users internally)
curl http://localhost:3000/users/123/articles
```

### Adding a New Package

1. Create package:
   ```bash
   kagaribi new comments --node
   ```

2. Define dependencies in `packages/comments/kagaribi.package.ts`:
   ```typescript
   export default definePackage({
     name: 'comments',
     dependencies: ['articles', 'users'],  // Needs both packages
   });
   ```

3. Update `kagaribi.config.ts`:
   ```typescript
   packages: {
     // ... existing packages
     comments: { colocateWith: 'root' },
   }
   ```

4. Implement routes in `packages/comments/src/index.ts`

## Per-Package CLAUDE.md Template

When creating detailed documentation for individual packages, use this template:

```markdown
# [Package Name] Package - Development Guide

## Purpose
[Brief description of what this package does]

## Dependencies
- [dependency1] - [why it's needed]
- [dependency2] - [why it's needed]

## Routes
- `GET /api/[resource]` - [description]
- `POST /api/[resource]` - [description]
- `PUT /api/[resource]/:id` - [description]
- `DELETE /api/[resource]/:id` - [description]

## Inter-Package Communication

### Calling Other Packages
\`\`\`typescript
import { getClient } from '@kagaribi/core';
import type { [Dependency]App } from '../../[dependency]/src/index.js';

const [dependency] = getClient<[Dependency]App>('[dependency]');
const res = await [dependency].api.[endpoint].$get();
\`\`\`

## Development Notes
- [Any package-specific considerations]
- [Common patterns used in this package]
- [Testing strategies]

## Deployment Considerations
- [Runtime requirements]
- [Environment variables needed]
- [Platform-specific notes]
```

## Common Tasks

### Modify Package Dependencies

Edit `packages/[name]/kagaribi.package.ts`:
```typescript
export default definePackage({
  name: 'articles',
  dependencies: ['users', 'auth'],  // Add or remove dependencies
});
```

### Change Deployment Target

Edit `kagaribi.config.ts`:
```typescript
packages: {
  articles: {
    target: 'cloudflare-workers',  // Change from co-located to independent
  },
}
```

### Add Environment-Specific Configuration

Edit `kagaribi.config.ts`:
```typescript
environments: {
  staging: {
    packages: {
      articles: {
        target: 'aws-lambda',
        url: '$STAGING_ARTICLES_URL',
      },
    },
  },
}
```

## Reference Documentation

For detailed information on:
- Database patterns → See `.claude/skills/development/references/database.md`
- Configuration options → See `.claude/skills/development/references/configuration.md`
- Development workflows → See `.claude/skills/development/SKILL.md`
- Deployment strategies → See `.claude/skills/deployment/SKILL.md`

## Testing Strategy

### Unit Testing
Test each package independently:
```bash
cd packages/users
pnpm test
```

### Integration Testing
Test inter-package communication:
```bash
# Start dev server
pnpm run dev

# Run integration tests
pnpm test:integration
```

### End-to-End Testing
Test complete workflows across all packages:
```bash
pnpm test:e2e
```

## Troubleshooting

**Issue:** RPC call fails between packages
- **Check:** Verify dependency is listed in `kagaribi.package.ts`
- **Check:** Ensure target package exports its app type

**Issue:** Route not found
- **Check:** Verify route is defined in package's Hono app
- **Check:** For nested routes, ensure `routes` array is configured in manifest

**Issue:** Development server fails to start
- **Check:** No port conflicts (default 3000)
- **Check:** All dependencies installed (`pnpm install`)
- **Check:** TypeScript compilation errors (`pnpm typecheck`)
