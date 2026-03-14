# 基本的な JWT 認証の実装

このガイドでは、Kagaribi で最小限の JWT 認証を実装する方法をステップバイステップで説明します。

## 前提条件

- Node.js 18 以上
- Kagaribi CLI がインストール済み
- 基本的な TypeScript と Hono の知識

---

## ステップ 1: プロジェクトの作成

```bash
# 新規プロジェクトを作成
kagaribi init auth-basic-example --node

cd auth-basic-example
```

---

## ステップ 2: 認証パッケージの作成

```bash
# auth パッケージを作成
kagaribi new auth
```

生成されたファイル:
```
packages/auth/
  ├── kagaribi.package.ts
  ├── package.json
  └── src/
      └── index.ts
```

---

## ステップ 3: 認証パッケージの実装

`packages/auth/src/index.ts` を以下のように実装します：

```typescript
import { Hono } from 'hono';
import { sign, jwt, createTokenPair, JWT_DEFAULTS } from '@kagaribi/core';

type Bindings = {
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// デモ用のユーザーデータ（実際のアプリではデータベースを使用）
const USERS = [
  { id: '1', email: 'user@example.com', password: 'password123', name: 'Test User' },
];

/**
 * POST /auth/login
 * ユーザー認証とトークン発行
 */
app.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  // ユーザー認証
  const user = USERS.find((u) => u.email === email && u.password === password);

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // トークンペアを生成
  const { accessToken, refreshToken, expiresIn } = await createTokenPair(
    {
      sub: user.id,
      email: user.email,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    },
    c.env.JWT_SECRET
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

/**
 * GET /auth/verify
 * トークン検証エンドポイント
 */
app.use('/verify', async (c, next) => {
  const jwtMiddleware = jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' });
  return jwtMiddleware(c, next);
});

app.get('/verify', (c) => {
  const payload = c.get('jwtPayload');
  return c.json({
    valid: true,
    user: payload.user || {
      id: payload.sub,
      email: payload.email,
    },
  });
});

export default app;
```

---

## ステップ 4: Protected API パッケージの作成

```bash
# api パッケージを作成
kagaribi new api
```

`packages/api/kagaribi.package.ts` で依存関係を設定：

```typescript
import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'api',
  dependencies: ['auth'],
  routes: ['/api'],
});
```

`packages/api/src/index.ts` を実装：

```typescript
import { Hono } from 'hono';
import { jwt, getAuthPayloadFromContext } from '@kagaribi/core';

type Bindings = {
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 全ルートを JWT で保護
app.use('*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256',
  });
  return jwtMiddleware(c, next);
});

/**
 * GET /api/profile
 * 認証済みユーザーのプロフィール
 */
app.get('/profile', (c) => {
  const payload = getAuthPayloadFromContext(c);

  if (!payload?.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({
    user: payload.user,
    message: 'This is your profile data',
  });
});

/**
 * GET /api/data
 * 保護されたデータ
 */
app.get('/data', (c) => {
  const payload = getAuthPayloadFromContext(c);

  return c.json({
    userId: payload.sub,
    data: ['Item 1', 'Item 2', 'Item 3'],
    timestamp: new Date().toISOString(),
  });
});

export default app;
```

---

## ステップ 5: ローカル開発サーバーの設定

プロジェクトルートに `serve.ts` を作成：

```typescript
import { serve } from '@hono/node-server';
import { mountAllLocal, registerLocalClient, requireEnv, createEnvMiddleware } from '@kagaribi/core';
import authApp from './packages/auth/src/index.js';
import apiApp from './packages/api/src/index.js';

// 環境変数を検証
const JWT_SECRET = requireEnv('JWT_SECRET');

// 環境変数ミドルウェアを作成
const envMiddleware = createEnvMiddleware({ JWT_SECRET });

// 各アプリに環境変数を設定
authApp.use('*', envMiddleware);
apiApp.use('*', envMiddleware);

// ローカルクライアントを登録
registerLocalClient({ name: 'auth', app: authApp });
registerLocalClient({ name: 'api', app: apiApp });

// すべてのパッケージをマウント
const app = mountAllLocal([
  { name: 'auth', basePath: '/auth', app: authApp },
  { name: 'api', basePath: '/api', app: apiApp },
]);

const port = 3000;

console.log(`🚀 Server starting on http://localhost:${port}`);
console.log('');
console.log('Available endpoints:');
console.log(`  POST http://localhost:${port}/auth/login`);
console.log(`  GET  http://localhost:${port}/auth/verify`);
console.log(`  GET  http://localhost:${port}/api/profile`);
console.log(`  GET  http://localhost:${port}/api/data`);
console.log('');
console.log('Demo credentials:');
console.log('  Email: user@example.com');
console.log('  Password: password123');

serve({ fetch: app.fetch, port });
```

`package.json` の scripts を更新：

```json
{
  "scripts": {
    "dev": "tsx --env-file=.env serve.ts"
  },
  "dependencies": {
    "@kagaribi/core": "workspace:*",
    "@hono/node-server": "^1.0.0",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## ステップ 6: 環境変数の設定

`.env` ファイルを作成：

```bash
JWT_SECRET=your-secret-key-change-this-in-production
```

`.env.example` も作成（Git にコミット用）：

```bash
JWT_SECRET=your-secret-key-change-this-in-production
```

---

## ステップ 7: 動作確認

### 開発サーバーを起動

```bash
pnpm install
pnpm dev
```

### ログイン

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

レスポンス例：
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "1",
    "email": "user@example.com",
    "name": "Test User"
  }
}
```

### トークン検証

```bash
TOKEN="<上記のaccessToken>"

curl http://localhost:3000/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

### Protected API にアクセス

```bash
curl http://localhost:3000/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

レスポンス例：
```json
{
  "user": {
    "id": "1",
    "email": "user@example.com",
    "name": "Test User"
  },
  "message": "This is your profile data"
}
```

---

## ステップ 8: テストスクリプトの作成（オプション）

`test-auth.sh` を作成：

```bash
#!/bin/bash

API_BASE="http://localhost:3000"

echo "=== Testing Login ==="
RESPONSE=$(curl -s -X POST $API_BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}')

echo "$RESPONSE" | jq '.'

TOKEN=$(echo "$RESPONSE" | jq -r '.accessToken')

echo ""
echo "=== Testing Protected API ==="
curl -s $API_BASE/api/profile \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "=== Testing Data Endpoint ==="
curl -s $API_BASE/api/data \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

実行：

```bash
chmod +x test-auth.sh
./test-auth.sh
```

---

## カスタマイズのポイント

### 1. データベース統合

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { users } from '../db/schema.js';

app.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  // データベースからユーザーを取得
  const user = await db.select().from(users).where(eq(users.email, email)).get();

  if (!user || !(await verifyPassword(password, user.hashedPassword))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // ...
});
```

### 2. パスワードのハッシュ化

```typescript
import { hash, verify as verifyHash } from '@node-rs/bcrypt';

// パスワードをハッシュ化
const hashedPassword = await hash(password, 10);

// パスワードを検証
const isValid = await verifyHash(password, user.hashedPassword);
```

### 3. リフレッシュトークンの実装

```typescript
app.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json();

  try {
    const payload = await verify(refreshToken, c.env.JWT_SECRET, 'HS256');

    if (payload.type !== 'refresh') {
      return c.json({ error: 'Invalid token type' }, 401);
    }

    // 新しいアクセストークンを生成
    const now = Math.floor(Date.now() / 1000);
    const accessToken = await sign(
      {
        sub: payload.sub,
        iat: now,
        exp: now + JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN,
      },
      c.env.JWT_SECRET,
      JWT_DEFAULTS.ALGORITHM
    );

    return c.json({ accessToken, expiresIn: JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN });
  } catch (error) {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
});
```

---

## 次のステップ

- [マルチパッケージ認証パターン](./auth-multipackage.md) - 複数パッケージでの認証実装
- [JWT 認証ガイド](../guides/jwt-authentication.md) - JWT の詳細な説明
- [auth-demo](../../examples/auth-demo/README.md) - 完全なリファレンス実装

---

## 関連リソース

- [Kagaribi 認証ガイド](../guides/authentication.md)
- [Hono JWT ミドルウェア](https://hono.dev/middleware/builtin/jwt)
