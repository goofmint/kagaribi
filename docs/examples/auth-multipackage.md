# マルチパッケージ認証の実装例

このガイドでは、Kagaribi の複数パッケージ間で認証を実装する方法を説明します。認証パッケージと API パッケージを分離し、コンテキスト伝播を使って認証情報を安全に転送します。

## 目次

- [概要](#概要)
- [パッケージ構成](#パッケージ構成)
- [プロジェクトのセットアップ](#プロジェクトのセットアップ)
- [認証パッケージの実装](#認証パッケージの実装)
- [API パッケージの実装](#api-パッケージの実装)
- [Gateway パッケージの実装](#gateway-パッケージの実装)
- [ローカル開発設定](#ローカル開発設定)
- [分離デプロイ設定](#分離デプロイ設定)
- [動作確認](#動作確認)
- [まとめ](#まとめ)

---

## 概要

マルチパッケージ認証では、以下の責任分離を実現します：

```
┌─────────────────┐
│ Gateway Package │  ← ユーザーからのリクエストを受け付ける
└────────┬────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌────────────────┐    ┌──────────────────┐
│  Auth Package  │    │  API Package     │
│                │    │                  │
│ - POST /login  │    │ - GET /profile   │
│ - POST /refresh│    │ - GET /data      │
└────────────────┘    └──────────────────┘
```

**メリット**:
- 認証ロジックを一箇所に集約
- API パッケージを独立してスケール可能
- 認証パッケージを複数のアプリで再利用可能
- パッケージごとに異なるランタイムを選択可能

---

## パッケージ構成

このガイドでは、以下の 3 つのパッケージを作成します：

| パッケージ | 責任 | 主要エンドポイント |
|-----------|------|-------------------|
| `gateway` | リクエストの振り分け、UI | `/`, `/login`, `/dashboard` |
| `auth` | 認証とトークン管理 | `POST /auth/api/login`, `POST /auth/api/refresh` |
| `api` | ビジネスロジック（認証必須） | `GET /api/profile`, `GET /api/data` |

---

## プロジェクトのセットアップ

### 1. プロジェクトの初期化

```bash
kagaribi init my-auth-app --node
cd my-auth-app
```

### 2. パッケージの作成

```bash
# Auth パッケージ
kagaribi new auth

# API パッケージ
kagaribi new api

# Gateway は root パッケージとして既に存在するため、そのまま使用
```

### 3. 環境変数の設定

`.env` ファイルを作成：

```env
JWT_SECRET=your-jwt-secret-change-in-production
SHARED_SECRET=your-shared-secret-change-in-production
```

---

## 認証パッケージの実装

### `packages/auth/src/index.ts`

```typescript
import { Hono } from 'hono';
import { sign, verify, createTokenPair, JWT_DEFAULTS } from '@kagaribi/core';
import type { JWTPayload } from 'hono/utils/jwt/types';

type Bindings = {
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// デモユーザー（実際のアプリではデータベースから取得）
const DEMO_USERS = [
  { id: 'user1', email: 'alice@example.com', password: 'password123', name: 'Alice' },
  { id: 'user2', email: 'bob@example.com', password: 'password456', name: 'Bob' },
];

// ログインエンドポイント
app.post('/auth/api/login', async (c) => {
  const { email, password } = await c.req.json();

  // ユーザー認証
  const user = DEMO_USERS.find((u) => u.email === email && u.password === password);

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // JWT トークンペアを生成
  const jwtSecret = c.env.JWT_SECRET;
  const { accessToken, refreshToken, expiresIn } = await createTokenPair(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    },
    jwtSecret
  );

  return c.json({
    accessToken,
    refreshToken,
    expiresIn,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

// リフレッシュトークンエンドポイント
app.post('/auth/api/refresh', async (c) => {
  const { refreshToken } = await c.req.json();

  if (!refreshToken) {
    return c.json({ error: 'Refresh token is required' }, 400);
  }

  try {
    const jwtSecret = c.env.JWT_SECRET;
    const payload = await verify(refreshToken, jwtSecret) as JWTPayload & { type?: string };

    if (payload.type !== 'refresh') {
      return c.json({ error: 'Invalid token type' }, 401);
    }

    // 新しいアクセストークンを発行
    const userId = payload.sub as string;
    const user = DEMO_USERS.find((u) => u.id === userId);

    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }

    const now = Math.floor(Date.now() / 1000);
    const accessToken = await sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        user: { id: user.id, email: user.email, name: user.name },
        iat: now,
        exp: now + JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN,
      },
      jwtSecret,
      JWT_DEFAULTS.ALGORITHM
    );

    return c.json({
      accessToken,
      expiresIn: JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN,
    });
  } catch (error) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }
});

// トークン検証エンドポイント（デバッグ用）
app.get('/auth/api/verify', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization header is required' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const jwtSecret = c.env.JWT_SECRET;
    const payload = await verify(token, jwtSecret) as JWTPayload & { user?: any };

    return c.json({
      valid: true,
      user: payload.user,
    });
  } catch (error) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});

export default app;
```

### `packages/auth/kagaribi.package.ts`

```typescript
import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'auth',
  dependencies: [],
});
```

---

## API パッケージの実装

### `packages/api/src/index.ts`

```typescript
import { Hono } from 'hono';
import { jwt, getAuthPayloadFromContext, kagaribiContextMiddleware } from '@kagaribi/core';

type Bindings = {
  JWT_SECRET: string;
  SHARED_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 分離デプロイ時のコンテキスト復元ミドルウェア
app.use('*', async (c, next) => {
  const sharedSecret = c.env.SHARED_SECRET;
  if (sharedSecret) {
    return kagaribiContextMiddleware(sharedSecret)(c, next);
  }
  await next();
});

// JWT 検証ミドルウェア
app.use('*', async (c, next) => {
  const jwtSecret = c.env.JWT_SECRET;
  return jwt({ secret: jwtSecret, alg: 'HS256' })(c, next);
});

// プロフィールエンドポイント
app.get('/api/profile', (c) => {
  // JWT ペイロードからユーザー情報を取得
  const payload = getAuthPayloadFromContext(c);
  const user = c.get('user') || payload?.user;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({
    user,
    message: 'This is your profile data',
  });
});

// データエンドポイント
app.get('/api/data', (c) => {
  const payload = getAuthPayloadFromContext(c);
  const user = c.get('user') || payload?.user;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({
    message: 'This is protected data',
    timestamp: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
    },
    data: {
      items: [
        { id: 1, name: 'Item 1', value: 100 },
        { id: 2, name: 'Item 2', value: 200 },
        { id: 3, name: 'Item 3', value: 300 },
      ],
    },
  });
});

export default app;
```

### `packages/api/kagaribi.package.ts`

```typescript
import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'api',
  dependencies: ['auth'], // auth パッケージに依存
});
```

---

## Gateway パッケージの実装

### `packages/root/src/index.tsx`

```typescript
import { Hono } from 'hono';
import { getClient } from '@kagaribi/core';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type authApp from '../../auth/src/index.js';
import type apiApp from '../../api/src/index.js';

const app = new Hono();

// 型安全な RPC クライアント
const authClient = getClient<typeof authApp>('auth');
const apiClient = getClient<typeof apiApp>('api');

// ルートパス
app.get('/', (c) => c.redirect('/login'));

// ログインフォーム
app.get('/login', (c) => {
  return c.html(
    <html>
      <head>
        <title>Login</title>
      </head>
      <body>
        <h1>Login</h1>
        <form method="POST" action="/login">
          <div>
            <label>Email:</label>
            <input type="email" name="email" required />
          </div>
          <div>
            <label>Password:</label>
            <input type="password" name="password" required />
          </div>
          <button type="submit">Login</button>
        </form>
      </body>
    </html>
  );
});

// ログイン処理
app.post('/login', async (c) => {
  const { email, password } = await c.req.parseBody();

  // Auth パッケージに認証リクエスト
  const response = await authClient['/auth/api/login'].$post({
    json: { email, password },
  });

  if (!response.ok) {
    return c.html('<h1>Login Failed</h1><a href="/login">Try Again</a>', 401);
  }

  const { accessToken, expiresIn } = await response.json();

  // Cookie にアクセストークンを保存
  setCookie(c, 'accessToken', accessToken, {
    path: '/',
    httpOnly: true,
    maxAge: expiresIn,
  });

  return c.redirect('/dashboard');
});

// ダッシュボード
app.get('/dashboard', async (c) => {
  const accessToken = getCookie(c, 'accessToken');

  if (!accessToken) {
    return c.redirect('/login');
  }

  // API からプロフィール取得
  const response = await apiClient['/api/profile'].$get(
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return c.redirect('/login');
  }

  const { user } = await response.json();

  return c.html(
    <html>
      <head>
        <title>Dashboard</title>
      </head>
      <body>
        <h1>Dashboard</h1>
        <p>Welcome, {user.name}!</p>
        <p>Email: {user.email}</p>
        <form method="POST" action="/logout">
          <button type="submit">Logout</button>
        </form>
      </body>
    </html>
  );
});

// ログアウト
app.post('/logout', (c) => {
  deleteCookie(c, 'accessToken');
  return c.redirect('/login');
});

export default app;
```

### `packages/root/kagaribi.package.ts`

```typescript
import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'root',
  dependencies: ['auth', 'api'],
});
```

---

## ローカル開発設定

### `serve.ts`

```typescript
import { serve } from '@hono/node-server';
import { mountAllLocal, requireEnv, createEnvMiddleware } from '@kagaribi/core';
import authApp from './packages/auth/src/index.js';
import apiApp from './packages/api/src/index.js';
import rootApp from './packages/root/src/index.js';

// 環境変数を取得
const JWT_SECRET = requireEnv('JWT_SECRET');
const SHARED_SECRET = requireEnv('SHARED_SECRET');

// 環境変数ミドルウェアを作成
const envMiddleware = createEnvMiddleware({
  JWT_SECRET,
  SHARED_SECRET,
});

// 各パッケージに環境変数を設定
authApp.use('*', envMiddleware);
apiApp.use('*', envMiddleware);
rootApp.use('*', envMiddleware);

// すべてのパッケージをローカルマウント
const app = mountAllLocal([
  { name: 'auth', basePath: '/auth', app: authApp },
  { name: 'api', basePath: '/api', app: apiApp },
  { name: 'root', basePath: '/', app: rootApp },
]);

// サーバー起動
const port = 3000;
console.log(`Server is running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
```

### `package.json`

```json
{
  "name": "my-auth-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx --env-file=.env serve.ts"
  },
  "dependencies": {
    "hono": "latest",
    "@kagaribi/core": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.19.2"
  }
}
```

---

## 分離デプロイ設定

### `kagaribi.config.ts`

```typescript
import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    root: {
      target: 'node',
    },
    auth: {
      target: 'node',
    },
    api: {
      target: 'node',
    },
  },
  environments: {
    production: {
      packages: {
        // Auth パッケージを Cloudflare Workers にデプロイ
        auth: {
          target: 'cloudflare-workers',
          url: '$AUTH_SERVICE_URL',
        },
        // API パッケージを Cloudflare Workers にデプロイ
        api: {
          target: 'cloudflare-workers',
          url: '$API_SERVICE_URL',
        },
        // Gateway は Node.js サーバーにデプロイ
        root: {
          target: 'node',
        },
      },
    },
  },
});
```

### デプロイ手順

```bash
# ビルド
kagaribi build --env production

# Auth パッケージをデプロイ
kagaribi deploy auth cloudflare-workers

# API パッケージをデプロイ
kagaribi deploy api cloudflare-workers

# 環境変数を設定（実際の URL）
export AUTH_SERVICE_URL=https://auth.example.workers.dev
export API_SERVICE_URL=https://api.example.workers.dev

# Gateway をデプロイ（Node.js サーバー）
node dist/packages/root/index.js
```

---

## 動作確認

### 1. ローカル開発

```bash
# 開発サーバー起動
pnpm dev
```

ブラウザで http://localhost:3000 を開き、以下を確認：

1. ログインフォームが表示される
2. `alice@example.com` / `password123` でログイン
3. ダッシュボードが表示され、ユーザー情報が正しい
4. ログアウトが動作する

### 2. API のテスト

```bash
# ログイン
curl -X POST http://localhost:3000/auth/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'

# レスポンス例
# {
#   "accessToken": "eyJhbGci...",
#   "refreshToken": "eyJhbGci...",
#   "expiresIn": 900,
#   "user": {"id": "user1", "email": "alice@example.com", "name": "Alice"}
# }

# プロフィール取得
curl http://localhost:3000/api/profile \
  -H "Authorization: Bearer <accessToken>"

# データ取得
curl http://localhost:3000/api/data \
  -H "Authorization: Bearer <accessToken>"
```

---

## まとめ

このガイドでは、Kagaribi を使った複数パッケージでの認証実装を学びました：

### ✅ 実装したこと

1. **認証パッケージ (`auth`)**
   - JWT トークンの発行（`createTokenPair()` 使用）
   - リフレッシュトークンの実装
   - トークン検証

2. **API パッケージ (`api`)**
   - JWT 検証ミドルウェア
   - コンテキスト伝播ミドルウェア（分離デプロイ対応）
   - 認証済みユーザー情報の取得

3. **Gateway パッケージ (`root`)**
   - ログイン UI
   - Cookie によるセッション管理
   - 型安全な RPC 呼び出し

### 📚 次のステップ

- **[CUSTOMIZATION.md](../../examples/auth-demo/CUSTOMIZATION.md)** - データベース統合や OAuth の追加
- **[ARCHITECTURE.md](../../examples/auth-demo/ARCHITECTURE.md)** - アーキテクチャの深掘り
- **[docs/guides/jwt-authentication.md](../guides/jwt-authentication.md)** - JWT 認証の詳細

### 🔐 セキュリティのポイント

- ✅ 環境変数でシークレットを管理（`requireEnv()` 使用）
- ✅ `httpOnly` Cookie で XSS 対策
- ✅ HMAC 署名でコンテキスト伝播を保護
- ✅ アクセストークンの有効期限を短く設定（15分）
- ✅ リフレッシュトークンで長期セッションをサポート

---

このパターンを応用して、独自の認証システムを構築してください！
