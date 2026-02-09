# @kagaribi/core

Core library for the [kagaribi](https://github.com/goofmint/kagaribi) microservices framework.

## Installation

```bash
npm install @kagaribi/core
```

## What's Included

- `defineConfig()` / `definePackage()` - Configuration helpers
- `getClient()` - Type-safe inter-package RPC (local or remote)
- `proxyMiddleware()` - HTTP proxy for remote packages
- `buildProject()` / `deployProject()` - Build and deploy orchestration
- `scaffoldPackage()` / `initProject()` - Project and package scaffolding
- `kagaribiParamsMiddleware()` - Path parameter extraction for nested routing

## Basic Usage

```typescript
import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    root: { target: 'node' },
    auth: { colocateWith: 'root' },
  },
});
```

```typescript
import { getClient } from '@kagaribi/core';
import type { UsersApp } from '../../users/src/index.js';

const users = getClient<UsersApp>('users');
const res = await users.api.users.$get();
```

## License

[MIT](../../LICENSE)
