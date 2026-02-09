# @kagaribi/cli

CLI tool for the [kagaribi](https://github.com/goofmint/kagaribi) microservices framework.

## Installation

```bash
npm install @kagaribi/cli
```

This package provides the `kagaribi` command.

## Commands

| Command | Description |
|---------|-------------|
| `kagaribi init <name> [--target]` | Initialize a new project |
| `kagaribi dev [port]` | Start development server (default: 3000) |
| `kagaribi new <name> [--target]` | Create a new package |
| `kagaribi build [--env name]` | Build for deployment |
| `kagaribi deploy [pkg] [--target] [--env]` | Deploy packages |

## Target Flags

| Flag | Target |
|------|--------|
| `--cloudflare` | Cloudflare Workers |
| `--lambda` | AWS Lambda |
| `--cloudrun` | Google Cloud Run |
| `--deno` | Deno Deploy |
| `--node` | Node.js |

## Quick Start

```bash
# Create a new project
kagaribi init my-project
cd my-project

# Start development
kagaribi dev

# Add a package
kagaribi new auth

# Deploy
kagaribi deploy auth --cloudflare
```

## License

[MIT](../../LICENSE)
