# Kagaribi における認証

このガイドでは、Kagaribi フレームワークにおける認証の基本概念と実装パターンを説明します。

## 目次

- [認証の基本概念](#認証の基本概念)
- [ローカル開発と分離デプロイ](#ローカル開発と分離デプロイ)
- [コンテキスト伝播の仕組み](#コンテキスト伝播の仕組み)
- [セキュリティのベストプラクティス](#セキュリティのベストプラクティス)

---

## 認証の基本概念

Kagaribi は、パッケージベースのマイクロサービスアーキテクチャを採用しています。認証を実装する際は、以下の設計原則に従います：

### 1. 認証パッケージの分離

認証ロジックを専用パッケージに分離することで、以下のメリットがあります：

- **単一責任の原則**: 認証処理を一箇所に集約
- **再利用性**: 複数のアプリケーションで同じ認証パッケージを使用可能
- **スケーラビリティ**: 認証パッケージを独立してスケール可能

```
my-app/
  packages/
    auth/           # 認証専用パッケージ
    api/            # ビジネスロジック（認証必須）
    public-api/     # 公開 API（認証不要）
```

### 2. ステートレス認証

Kagaribi では、JWT（JSON Web Token）を使用したステートレス認証を推奨します：

- **スケーラブル**: セッションストアが不要
- **分散システム対応**: 複数のサーバー間でトークンを共有可能
- **マイクロサービスフレンドリー**: パッケージ間でトークンを伝播可能

### 3. 認証情報の伝播

Kagaribi のコンテキスト伝播機能により、認証情報をパッケージ間で自動的に転送できます：

```typescript
// Gateway パッケージで JWT を検証
app.use('/api/*', jwt({ secret: 'mySecret' }));

// Protected API パッケージで認証情報を受信
// → Kagaribi が自動的にコンテキストを伝播
```

---

## ローカル開発と分離デプロイ

Kagaribi の認証システムは、ローカル開発と本番環境の分離デプロイの両方をサポートします。

### ローカル開発モード

ローカル開発では、すべてのパッケージが同一プロセスで動作します：

```typescript
// serve.ts
import { mountAllLocal } from '@kagaribi/core';
import authApp from './packages/auth/src/index.js';
import apiApp from './packages/api/src/index.js';

const app = mountAllLocal([
  { name: 'auth', basePath: '/auth', app: authApp },
  { name: 'api', basePath: '/api', app: apiApp },
]);
```

**メリット**:
- ✅ セットアップが簡単
- ✅ デバッグが容易
- ✅ コンテキストが自動的に共有される

### 分離デプロイモード

本番環境では、パッケージを別々のサーバーにデプロイできます：

```typescript
// kagaribi.config.ts
export default defineConfig({
  packages: {
    auth: {
      target: 'cloudflare-workers',
      url: '$AUTH_SERVICE_URL',
    },
    api: {
      target: 'aws-lambda',
      url: '$API_SERVICE_URL',
    },
  },
});
```

**メリット**:
- ✅ 独立したスケーリング
- ✅ 異なるランタイム環境を選択可能
- ✅ 障害の分離

---

## コンテキスト伝播の仕組み

Kagaribi のコンテキスト伝播により、認証情報をパッケージ間で安全に転送できます。

### 基本フロー

```
[Client]
   ↓ Authorization: Bearer <token>
[Gateway Package]
   ↓ JWT 検証
   ↓ ユーザー情報を c.set('user', ...)
   ↓ X-Kagaribi-Context: {user: {...}}
   ↓ X-Kagaribi-Signature: <HMAC>
[Protected API Package]
   ↓ コンテキスト検証・復元
   ↓ c.get('user')
[Response]
```

### 実装例

**Gateway パッケージ（送信側）:**

```typescript
import { jwt, getAuthPayloadFromContext } from '@kagaribi/core';

app.use('/api/*', jwt({ secret: 'mySecret' }));

app.use('/api/*', async (c, next) => {
  const payload = getAuthPayloadFromContext(c);
  if (payload?.user) {
    c.set('user', payload.user);
  }
  await next();
});
```

**Protected API パッケージ（受信側）:**

```typescript
import { kagaribiContextMiddleware } from '@kagaribi/core';

// コンテキストミドルウェアで認証情報を復元
app.use('*', kagaribiContextMiddleware('shared-secret'));

app.get('/profile', (c) => {
  const user = c.get('user');
  return c.json({ user });
});
```

### セキュリティ

コンテキスト伝播は HMAC-SHA256 署名で保護されています：

1. **署名生成**: 送信側で `X-Kagaribi-Context` を共有シークレットで署名
2. **署名検証**: 受信側で署名を検証してから復元
3. **改ざん防止**: 署名が一致しない場合は 403 Forbidden

```typescript
// 共有シークレットは環境変数で管理
const SHARED_SECRET = requireEnv('SHARED_SECRET');
```

---

## セキュリティのベストプラクティス

### 1. シークレットの管理

**❌ 悪い例:**
```typescript
const secret = 'my-secret-key'; // ハードコード
```

**✅ 良い例:**
```typescript
import { requireEnv } from '@kagaribi/core';

const JWT_SECRET = requireEnv('JWT_SECRET');
const SHARED_SECRET = requireEnv('SHARED_SECRET');
```

### 2. トークンの有効期限

アクセストークンは短く、リフレッシュトークンは長く設定します：

```typescript
import { JWT_DEFAULTS, createTokenPair } from '@kagaribi/core';

const { accessToken, refreshToken } = await createTokenPair(
  { sub: user.id, user },
  JWT_SECRET
);

// デフォルト:
// - アクセストークン: 15分
// - リフレッシュトークン: 7日
```

### 3. HTTPS の使用

本番環境では必ず HTTPS を使用してください：

- トークンの盗聴を防止
- 中間者攻撃を防止

### 4. トークンの保存

**クライアント側:**

- ✅ `httpOnly` Cookie（推奨）
- ⚠️ `localStorage`（XSS のリスク）
- ❌ `sessionStorage`（タブを閉じると消える）

**サーバー側:**

- トークンを保存しない（ステートレス）
- リフレッシュトークンのハッシュのみ保存（必要な場合）

### 5. エラーハンドリング

認証エラーは適切に処理してください：

```typescript
app.use('/api/*', jwt({ secret: JWT_SECRET }));

app.onError((err, c) => {
  if (err.message.includes('jwt')) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
  return c.json({ error: 'Internal server error' }, 500);
});
```

### 6. レート制限

ブルートフォース攻撃を防ぐため、ログインエンドポイントにレート制限を設定します：

```typescript
import { rateLimiter } from 'hono-rate-limiter';

app.post('/login', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回
}), async (c) => {
  // ログイン処理
});
```

---

## 次のステップ

- [JWT 認証の詳細](./jwt-authentication.md)
- [基本的な認証実装例](../examples/auth-basic.md)
- [マルチパッケージ認証パターン](../examples/auth-multipackage.md)
- [auth-demo リファレンス実装](../../examples/auth-demo/README.md)

---

## 関連リソース

- [Hono JWT ミドルウェア](https://hono.dev/middleware/builtin/jwt)
- [JWT.io](https://jwt.io/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
