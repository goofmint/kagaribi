# JWT 認証の実装

このガイドでは、Kagaribi で JWT（JSON Web Token）認証を実装する方法を詳しく説明します。

## 目次

- [JWT とは](#jwt-とは)
- [Kagaribi の JWT サポート](#kagaribi-の-jwt-サポート)
- [トークン発行](#トークン発行)
- [トークン検証](#トークン検証)
- [リフレッシュトークン](#リフレッシュトークン)
- [環境変数の設定](#環境変数の設定)

---

## JWT とは

JWT（JSON Web Token）は、JSON ベースのオープンスタンダード（RFC 7519）で、以下の特徴があります：

### 構造

JWT は 3 つの部分で構成されます：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
│────────── Header ──────────│────────────── Payload ──────────────│────────── Signature ────────│
```

1. **Header**: アルゴリズムとトークンタイプ
2. **Payload**: クレーム（ユーザー情報など）
3. **Signature**: ヘッダーとペイロードの署名

### メリット

- ✅ **ステートレス**: サーバー側でセッション管理が不要
- ✅ **スケーラブル**: 複数のサーバー間で簡単に共有可能
- ✅ **自己完結型**: トークン内にすべての情報を含む
- ✅ **標準化**: 広くサポートされている

---

## Kagaribi の JWT サポート

Kagaribi は Hono の JWT 機能を再エクスポートし、追加のヘルパー関数を提供します。

### 提供される機能

| 機能 | 説明 | 用途 |
|------|------|------|
| `jwt()` | JWT 検証ミドルウェア | ルートの保護 |
| `sign()` | トークン生成 | ログイン時 |
| `verify()` | トークン検証 | カスタム検証 |
| `decode()` | トークンデコード | ペイロード確認 |
| `createTokenPair()` | トークンペア生成 | アクセス + リフレッシュ |
| `getAuthPayloadFromContext()` | ペイロード取得 | ユーザー情報取得 |
| `JWT_DEFAULTS` | デフォルト設定 | 標準的な有効期限 |

### インポート

```typescript
import {
  jwt,
  sign,
  verify,
  decode,
  createTokenPair,
  getAuthPayloadFromContext,
  JWT_DEFAULTS,
} from '@kagaribi/core';
```

---

## トークン発行

### 基本的なトークン発行

```typescript
import { sign } from '@kagaribi/core';

const token = await sign(
  {
    sub: 'user123',           // ユーザーID（必須）
    email: 'user@example.com',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1時間
  },
  'your-secret-key',
  'HS256'
);
```

### トークンペアの生成（推奨）

アクセストークンとリフレッシュトークンを同時に生成：

```typescript
import { createTokenPair, JWT_DEFAULTS } from '@kagaribi/core';

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
  JWT_SECRET
);

// デフォルト有効期限:
// - accessToken: 900秒（15分）
// - refreshToken: 604800秒（7日）
```

### カスタム有効期限

```typescript
const tokens = await createTokenPair(
  { sub: user.id, user },
  JWT_SECRET,
  {
    accessExpiresIn: 3600,        // 1時間
    refreshExpiresIn: 2592000,    // 30日
  }
);
```

### ログインエンドポイントの実装

```typescript
import { createTokenPair, requireEnv } from '@kagaribi/core';

type Bindings = {
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  // ユーザー認証（データベースから取得）
  const user = await db.findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.hashedPassword))) {
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
```

---

## トークン検証

### JWT ミドルウェアの使用

```typescript
import { jwt } from '@kagaribi/core';

// 全ルートを保護
app.use('*', jwt({ secret: 'your-secret-key', alg: 'HS256' }));

// 特定のルートのみ保護
app.use('/api/protected/*', jwt({ secret: 'your-secret-key' }));

// ルートハンドラーで JWT ペイロードを使用
app.get('/api/protected/profile', (c) => {
  const payload = c.get('jwtPayload');
  return c.json({ userId: payload.sub });
});
```

### 環境変数から JWT シークレットを取得

```typescript
import { jwt, requireEnv, createEnvMiddleware } from '@kagaribi/core';

// 環境変数を検証
const JWT_SECRET = requireEnv('JWT_SECRET');

// Node.js 環境では c.env に設定
const envMiddleware = createEnvMiddleware({ JWT_SECRET });
app.use('*', envMiddleware);

// JWT ミドルウェアで検証
app.use('/api/*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256',
  });
  return jwtMiddleware(c, next);
});
```

### カスタム検証

```typescript
import { verify, getAuthPayloadFromContext } from '@kagaribi/core';

app.get('/custom-verify', async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return c.json({ error: 'No token provided' }, 401);
  }

  try {
    const payload = await verify(token, JWT_SECRET, 'HS256');

    // カスタムロジック
    if (payload.role !== 'admin') {
      return c.json({ error: 'Admin only' }, 403);
    }

    return c.json({ message: 'Welcome admin!' });
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
```

### ペイロードの取得

```typescript
import { getAuthPayloadFromContext } from '@kagaribi/core';
import type { KagaribiJwtPayload } from '@kagaribi/core';

app.get('/profile', (c) => {
  const payload = getAuthPayloadFromContext(c);

  if (!payload?.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({
    user: payload.user,
    expiresAt: payload.exp,
  });
});
```

---

## リフレッシュトークン

### リフレッシュトークンの実装

```typescript
import { verify, sign, JWT_DEFAULTS } from '@kagaribi/core';

app.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json();

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400);
  }

  try {
    // リフレッシュトークンを検証
    const payload = await verify(refreshToken, JWT_SECRET, 'HS256');

    // リフレッシュトークンであることを確認
    if (payload.type !== 'refresh') {
      return c.json({ error: 'Invalid token type' }, 401);
    }

    // ユーザー情報を取得
    const user = await db.findUserById(payload.sub);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // 新しいアクセストークンを生成
    const now = Math.floor(Date.now() / 1000);
    const accessToken = await sign(
      {
        sub: user.id,
        email: user.email,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        iat: now,
        exp: now + JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN,
      },
      JWT_SECRET,
      JWT_DEFAULTS.ALGORITHM
    );

    return c.json({
      accessToken,
      expiresIn: JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN,
    });
  } catch (error) {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
});
```

### トークンローテーション（推奨）

セキュリティ向上のため、リフレッシュトークンも新しく発行します：

```typescript
app.post('/refresh', async (c) => {
  // ... 検証処理 ...

  // 新しいトークンペアを生成
  const { accessToken, refreshToken, expiresIn } = await createTokenPair(
    {
      sub: user.id,
      email: user.email,
      user: { id: user.id, email: user.email, name: user.name },
    },
    JWT_SECRET
  );

  // 古いリフレッシュトークンを無効化（必要な場合）
  await db.revokeRefreshToken(payload.jti);

  return c.json({
    accessToken,
    refreshToken,  // 新しいリフレッシュトークン
    expiresIn,
  });
});
```

---

## 環境変数の設定

### 必須環境変数

```bash
# .env
JWT_SECRET=your-secret-key-change-this-in-production
SHARED_SECRET=your-shared-secret-change-this-in-production
```

### 環境変数の検証

```typescript
import { requireEnv } from '@kagaribi/core';

// アプリ起動時に検証
const JWT_SECRET = requireEnv('JWT_SECRET');
const SHARED_SECRET = requireEnv('SHARED_SECRET');

// エラー例:
// Error: JWT_SECRET environment variable is required
```

### Node.js での環境変数設定

```typescript
import { createEnvMiddleware } from '@kagaribi/core';

const envMiddleware = createEnvMiddleware({
  JWT_SECRET: process.env.JWT_SECRET!,
  SHARED_SECRET: process.env.SHARED_SECRET!,
});

app.use('*', envMiddleware);
```

### Cloudflare Workers での環境変数

```typescript
// wrangler.toml
[vars]
# 公開しても良い変数

# Cloudflare Dashboard で設定する秘密情報:
# JWT_SECRET
# SHARED_SECRET
```

```typescript
type Bindings = {
  JWT_SECRET: string;
  SHARED_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/api/*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,  // 自動的に利用可能
  });
  return jwtMiddleware(c, next);
});
```

---

## トラブルシューティング

### よくあるエラー

#### 1. "Invalid token"

**原因**: トークンの署名が無効、または有効期限切れ

**解決方法**:
```typescript
try {
  const payload = await verify(token, JWT_SECRET, 'HS256');
} catch (error) {
  if (error.message.includes('exp')) {
    return c.json({ error: 'Token expired' }, 401);
  }
  return c.json({ error: 'Invalid token' }, 401);
}
```

#### 2. "JWT_SECRET environment variable is required"

**原因**: 環境変数が設定されていない

**解決方法**:
1. `.env` ファイルを作成
2. `JWT_SECRET=your-secret-key` を追加
3. `tsx --env-file=.env serve.ts` で起動

#### 3. トークンが長すぎる

**原因**: ペイロードに大量のデータを含めている

**解決方法**:
```typescript
// ❌ 悪い例: 大量のデータを含める
const token = await sign({
  sub: user.id,
  allUserData: { /* 大量のデータ */ },
}, secret);

// ✅ 良い例: 必要最小限の情報のみ
const token = await sign({
  sub: user.id,
  user: { id: user.id, email: user.email, name: user.name },
}, secret);
```

---

## 次のステップ

- [基本的な認証実装例](../examples/auth-basic.md)
- [マルチパッケージ認証パターン](../examples/auth-multipackage.md)
- [auth-demo リファレンス実装](../../examples/auth-demo/README.md)

---

## 参考資料

- [JWT.io - JWT Debugger](https://jwt.io/)
- [RFC 7519 - JWT 仕様](https://datatracker.ietf.org/doc/html/rfc7519)
- [Hono JWT ミドルウェア](https://hono.dev/middleware/builtin/jwt)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
