# kagaribi

A Hono-based microservices framework for monorepos. Develop packages locally in a single process, then deploy individually to Cloudflare Workers, AWS Lambda, Google Cloud Run, Deno Deploy, or Node.js.

## Features

- **Package-based architecture** - Split features into independent Hono apps
- **Transparent RPC** - Call other packages with `getClient()` regardless of local or remote deployment
- **Multi-target deployment** - Deploy from one codebase to multiple cloud platforms
- **Co-location** - Run all packages in a single process during development, split in production
- **Nested routing** - Cross-package path patterns like `/users/:userId/articles`
- **WebComponent UI** - Each package can serve both API and UI
- **Database support** - Built-in Drizzle ORM integration with PostgreSQL/MySQL

## Quick Start

```bash
# Create a new project
kagaribi init my-project
cd my-project

# Start the development server
kagaribi dev
```

### With Database Support

```bash
# Create a project with PostgreSQL
kagaribi init my-blog --db postgresql
cd my-blog

# Configure database connection
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run migrations and start
pnpm run db:migrate
pnpm run dev
```

## Adding Packages

```bash
# Create a new package (co-located with root by default)
kagaribi new auth

# Create with a specific deploy target
kagaribi new payments --cloudflare
```

## Deployment

```bash
# Deploy a package to a target
kagaribi deploy users --cloudrun
kagaribi deploy auth --cloudflare

# Deploy all undeployed packages
kagaribi deploy --cloudflare
```

After deployment, `kagaribi.config.ts` is automatically updated with the deployed URL.

## Packages

| Package | Description |
|---------|-------------|
| [@kagaribi/core](./packages/core) | Core library (config, RPC, proxy, build) |
| [@kagaribi/cli](./packages/cli) | CLI tool (init, dev, new, build, deploy) |

## Documentation

- [Usage Guide (English)](./USAGE.md)
- [README (Japanese)](./README.ja.md)

## License

[MIT](./LICENSE)
