# Kagaribi Framework - Development Guide

Kagaribi is a Hono-based microservices framework for building and deploying
distributed applications. Develop packages locally in a monorepo, then deploy
them individually to multiple cloud platforms.

## What is Kagaribi?

A framework that enables:
- **Package-based architecture** - Split features into independent Hono apps
- **Transparent RPC** - Call other packages with `getClient()` regardless of deployment
- **Multi-target deployment** - Deploy to Cloudflare Workers, AWS Lambda, Google Cloud Run, Deno Deploy, or Node.js
- **Database support** - Built-in Drizzle ORM integration with PostgreSQL/MySQL
- **Nested routing** - Cross-package path patterns like `/users/:userId/articles`

## Available CLI Commands

### Project Initialization
```bash
kagaribi init <name> [--cloudflare|--lambda|--cloudrun|--deno|--node] [--db postgresql|mysql]
```

### Development
```bash
kagaribi dev [port]           # Start local development server (default: 3000)
kagaribi new <name> [target]  # Create new package with scaffolding
```

### Model Management (Database)
```bash
kagaribi model new <name> --db <dialect>  # Generate Drizzle ORM model
```

### Build & Deployment
```bash
kagaribi build [--env name]               # Build project for deployment
kagaribi deploy [pkg] [target] [--env]    # Deploy packages to cloud platforms
```

## Claude Skills

This repository includes specialized Claude skills for common workflows:

- **`.claude/skills/project-setup/`** - Initialize new projects and configure databases
- **`.claude/skills/development/`** - Create packages, write code, and test locally
- **`.claude/skills/deployment/`** - Build, deploy, and manage cloud deployments

Each skill directory contains a `SKILL.md` file with detailed guidance for that workflow.

## Documentation

- [Full Usage Guide](./USAGE.md) - Comprehensive documentation
- [README (English)](./README.md) - Project overview
- [README (Japanese)](./README.ja.md) - 日本語版README

## Project Structure

```
my-project/
  kagaribi.config.ts          # Deployment configuration
  packages/
    root/                     # Entry point package (required)
      kagaribi.package.ts
      src/index.ts
    <other-packages>/
  db/                         # Database schema (if using --db)
    schema.ts
    index.ts
  pnpm-workspace.yaml
  package.json
```

## Key Concepts

- **Packages** - Independent Hono applications with their own routes and logic
- **Co-location** - Multiple packages running in a single process during development
- **RPC Client** - Type-safe inter-package communication via `getClient<T>()`
- **Target** - Deployment destination (cloudflare, lambda, cloudrun, deno, node)
