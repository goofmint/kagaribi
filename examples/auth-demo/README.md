# Kagaribi Auth Demo

実用的な JWT 認証フローのデモアプリケーションです。パッケージ間での認証情報伝播と、ローカル開発から分離デプロイまでの流れを示します。

## アーキテクチャ

このデモは 3 つのパッケージで構成されています：

### 1. `auth` パッケージ
認証を担当するパッケージ。JWT トークンの発行と検証を行います。

- `POST /auth/api/login` - ユーザー認証とトークン発行
- `POST /auth/api/refresh` - リフレッシュトークンによるアクセストークン再発行
- `GET /auth/api/verify` - トークン検証

### 2. `protected-api` パッケージ
認証が必要な API を提供するパッケージ。

- `GET /api/profile` - ユーザープロフィール情報
- `GET /api/secret` - 認証必須のサンプルデータ

### 3. `root` パッケージ
フロントエンド UI を提供するパッケージ。

- `GET /login` - ログインフォーム
- `GET /dashboard` - ダッシュボード（認証必須）

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定（必須）

**重要**: 環境変数の設定は必須です。フォールバック処理は実装されていません。

`.env.example` をコピーして `.env` を作成します：

```bash
cp .env.example .env
```

`.env` ファイルを編集：

```env
# 必須: JWT トークンの署名に使用するシークレット
JWT_SECRET=your-secret-key-change-this-in-production

# 必須: Kagaribi コンテキスト伝播の署名に使用するシークレット
SHARED_SECRET=your-shared-secret-change-this-in-production
```

**注意**:
- これらの環境変数が設定されていない場合、アプリケーションは起動時にエラーを出します
- Cloudflare Workers へのデプロイ時は、Cloudflare の環境変数設定を使用してください
- `process.env` は使用していません（Cloudflare Workers 対応のため `c.env` を使用）

## ローカル実行

### 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで http://localhost:3000 を開きます。

### デモ用認証情報

以下のユーザーでログインできます：

- **Alice**
  - Email: `alice@example.com`
  - Password: `password123`

- **Bob**
  - Email: `bob@example.com`
  - Password: `password456`

## API エンドポイント

### 認証 API（auth パッケージ）

#### POST /auth/api/login
ユーザー認証を行い、アクセストークンとリフレッシュトークンを発行します。

**リクエスト:**
```json
{
  "email": "alice@example.com",
  "password": "password123"
}
```

**レスポンス:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "user1",
    "email": "alice@example.com",
    "name": "Alice"
  }
}
```

#### POST /auth/api/refresh
リフレッシュトークンを使用して新しいアクセストークンを取得します。

**リクエスト:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

#### GET /auth/api/verify
トークンの検証を行います。

**ヘッダー:**
```
Authorization: Bearer <accessToken>
```

**レスポンス:**
```json
{
  "valid": true,
  "user": {
    "id": "user1",
    "email": "alice@example.com",
    "name": "Alice"
  }
}
```

### Protected API（protected-api パッケージ）

すべてのエンドポイントは JWT 認証が必要です。

#### GET /api/profile
認証済みユーザーのプロフィール情報を返します。

**ヘッダー:**
```
Authorization: Bearer <accessToken>
```

**レスポンス:**
```json
{
  "user": {
    "id": "user1",
    "email": "alice@example.com",
    "name": "Alice"
  },
  "message": "This is your profile data"
}
```

#### GET /api/secret
認証必須のサンプルデータを返します。

**ヘッダー:**
```
Authorization: Bearer <accessToken>
```

**レスポンス:**
```json
{
  "message": "This is secret data only for authenticated users",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "user": {
    "id": "user1",
    "name": "Alice"
  },
  "secretData": {
    "apiKey": "sk_test_1234567890",
    "plan": "premium",
    "quota": {
      "used": 42,
      "limit": 1000
    }
  }
}
```

## 分離デプロイのテスト

### ビルド

```bash
pnpm build
```

または、特定の環境向けにビルド：

```bash
pnpm build --env production
```

### デプロイ

すべてのパッケージをデプロイ：

```bash
pnpm deploy
```

特定のパッケージのみデプロイ：

```bash
kagaribi deploy auth cloudflare-workers
kagaribi deploy protected-api cloudflare-workers
```

### 分離デプロイ時の認証情報伝播

production 環境では、`auth` と `protected-api` パッケージが別の URL にデプロイされます。このとき、Kagaribi のコンテキスト伝播機能により、JWT 認証情報がパッケージ間で自動的に伝播されます。

**認証フロー:**

1. ユーザーが `root` パッケージ（`/login`）でログイン
2. `root` が `auth` パッケージの `/auth/api/login` を呼び出し
3. `auth` が JWT トークンを発行して返却
4. ユーザーが `root` の `/dashboard` にアクセス
5. `root` が `protected-api` の `/api/profile` を呼び出し（JWT トークンを含む）
6. `protected-api` が JWT を検証してユーザー情報を返却

**Kagaribi コンテキスト伝播の仕組み:**

- ローカル実行時：すべてのパッケージが同一プロセスで動作し、Hono の `c.set()` / `c.get()` でコンテキストを共有
- 分離デプロイ時：
  - `root` → `protected-api` へのリクエスト時、JWT ペイロードを `X-Kagaribi-Context` ヘッダーに含めて送信
  - `protected-api` が `kagaribiContextMiddleware` でヘッダーを検証・復元
  - 署名には `SHARED_SECRET` 環境変数を使用

## プロジェクト構造

```
auth-demo/
├── kagaribi.config.ts          # Kagaribi 設定
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── serve.ts                    # ローカル開発サーバー
├── .env.example                # 環境変数テンプレート
├── README.md
└── packages/
    ├── auth/                   # 認証パッケージ
    │   ├── kagaribi.package.ts
    │   ├── package.json
    │   └── src/
    │       └── index.ts
    ├── protected-api/          # Protected API パッケージ
    │   ├── kagaribi.package.ts
    │   ├── package.json
    │   └── src/
    │       └── index.ts
    └── root/                   # Root パッケージ（UI）
        ├── kagaribi.package.ts
        ├── package.json
        └── src/
            └── index.tsx
```

## 学習ポイント

このデモから以下を学ぶことができます：

1. **JWT 認証の実装**
   - `@kagaribi/core` の `sign()`, `verify()`, `jwt()` ミドルウェアの使用方法
   - アクセストークンとリフレッシュトークンの発行

2. **認証情報の伝播**
   - `getAuthPayloadFromContext()` による JWT ペイロードの取得
   - `kagaribiContextMiddleware` による分離デプロイ時のコンテキスト伝播

3. **パッケージ間通信**
   - `getClient<T>()` による型安全な RPC 呼び出し
   - ローカル実行と分離デプロイの透過的な切り替え

4. **Hono JSX**
   - サーバーサイドレンダリングによる UI 構築
   - フォーム処理と Cookie 管理

## Kagaribi Core 認証機能の使用

このデモでは、Kagaribi Core が提供する認証ユーティリティを活用しています。これらの機能を使うことで、認証実装のコードを大幅に簡潔にできます。

### JWT_DEFAULTS 定数

JWT トークンのデフォルト設定値を提供します：

```typescript
import { JWT_DEFAULTS } from '@kagaribi/core';

// アクセストークンの有効期限: 15分（900秒）
console.log(JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN); // 900

// リフレッシュトークンの有効期限: 7日（604800秒）
console.log(JWT_DEFAULTS.REFRESH_TOKEN_EXPIRES_IN); // 604800

// JWT 署名アルゴリズム
console.log(JWT_DEFAULTS.ALGORITHM); // 'HS256'
```

### createTokenPair() ヘルパー

アクセストークンとリフレッシュトークンのペアを簡単に生成できます：

```typescript
import { createTokenPair } from '@kagaribi/core';

// トークンペアを生成（auth パッケージで使用）
const { accessToken, refreshToken, expiresIn } = await createTokenPair(
  {
    sub: user.id,
    email: user.email,
    name: user.name,
    user: { id: user.id, email: user.email, name: user.name },
  },
  jwtSecret
);

// カスタム有効期限を指定することも可能
const tokens = await createTokenPair(
  { sub: user.id, user: { id: user.id } },
  jwtSecret,
  {
    accessExpiresIn: 60 * 30,      // 30分
    refreshExpiresIn: 60 * 60 * 24 * 30, // 30日
  }
);
```

**Before（手動実装）:**
```typescript
// 約15行のコード
const ACCESS_TOKEN_EXPIRES_IN = 60 * 15;
const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7;
const now = Math.floor(Date.now() / 1000);

const accessToken = await sign(
  { sub: user.id, email: user.email, ..., iat: now, exp: now + ACCESS_TOKEN_EXPIRES_IN },
  jwtSecret,
  'HS256'
);

const refreshToken = await sign(
  { sub: user.id, type: 'refresh', iat: now, exp: now + REFRESH_TOKEN_EXPIRES_IN },
  jwtSecret,
  'HS256'
);
```

**After（createTokenPair 使用）:**
```typescript
// 約7行のコード（50% 削減）
const { accessToken, refreshToken, expiresIn } = await createTokenPair(
  {
    sub: user.id,
    email: user.email,
    user: { id: user.id, email: user.email, name: user.name },
  },
  jwtSecret
);
```

### requireEnv() ユーティリティ

環境変数の取得と検証を簡潔に行えます：

```typescript
import { requireEnv } from '@kagaribi/core';

// 環境変数を取得（存在しない場合はエラー）
const JWT_SECRET = requireEnv('JWT_SECRET');
const SHARED_SECRET = requireEnv('SHARED_SECRET');

// デフォルト値を指定
const PORT = requireEnv('PORT', '3000');
```

### createEnvMiddleware() ミドルウェア

Node.js の `process.env` を Hono の `c.env` に設定するミドルウェアを生成します（Cloudflare Workers との互換性のため）：

```typescript
import { createEnvMiddleware, requireEnv } from '@kagaribi/core';

const JWT_SECRET = requireEnv('JWT_SECRET');
const SHARED_SECRET = requireEnv('SHARED_SECRET');

// ミドルウェアを生成
const envMiddleware = createEnvMiddleware({
  JWT_SECRET,
  SHARED_SECRET,
});

// すべてのパッケージに適用
authApp.use('*', envMiddleware);
protectedApiApp.use('*', envMiddleware);
rootApp.use('*', envMiddleware);
```

**Before（手動実装）:**
```typescript
// 約17行のコード
const createEnvMiddleware = (envVars: Record<string, string>) => {
  return async (c: any, next: any) => {
    for (const [key, value] of Object.entries(envVars)) {
      c.env = c.env || {};
      c.env[key] = value;
    }
    await next();
  };
};

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');
// ...
```

**After（Core ユーティリティ使用）:**
```typescript
// 約5行のコード（70% 削減）
const JWT_SECRET = requireEnv('JWT_SECRET');
const SHARED_SECRET = requireEnv('SHARED_SECRET');
const envMiddleware = createEnvMiddleware({ JWT_SECRET, SHARED_SECRET });
authApp.use('*', envMiddleware);
protectedApiApp.use('*', envMiddleware);
```

## 詳細ドキュメント

より詳しい情報は、以下のドキュメントを参照してください：

### アーキテクチャとカスタマイズ

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - auth-demo のアーキテクチャ解説
  - 全体アーキテクチャとパッケージ構成
  - 認証フローの詳細図
  - データフローとデプロイモード
  - セキュリティ設計

- **[CUSTOMIZATION.md](./CUSTOMIZATION.md)** - カスタマイズガイド
  - データベース統合（PostgreSQL + Drizzle ORM）
  - カスタム認証ロジック（OAuth、MFA）
  - UI のカスタマイズ（React への移行、テーマシステム）
  - エラーハンドリングの拡張
  - 追加機能の実装（パスワードリセット、アクティビティログ）

### 実装ガイド

- **[docs/guides/authentication.md](../../docs/guides/authentication.md)** - Kagaribi における認証の基本概念
  - 認証の設計原則
  - ローカル開発と分離デプロイ
  - コンテキスト伝播の仕組み
  - セキュリティのベストプラクティス

- **[docs/guides/jwt-authentication.md](../../docs/guides/jwt-authentication.md)** - JWT 認証の詳細ガイド
  - JWT の構造と仕組み
  - トークン発行と検証
  - リフレッシュトークンの実装
  - 環境変数の設定
  - トラブルシューティング

- **[docs/examples/auth-basic.md](../../docs/examples/auth-basic.md)** - 基本的な認証実装例
  - 最小限の JWT 認証実装
  - ステップバイステップの実装ガイド
  - カスタマイズポイントの解説

## よくある質問（FAQ）

### Q: トークンの有効期限を変更するには？

**A:** `createTokenPair()` のオプションで指定できます：

```typescript
const { accessToken, refreshToken } = await createTokenPair(
  payload,
  secret,
  {
    accessExpiresIn: 60 * 30,      // 30分
    refreshExpiresIn: 60 * 60 * 24 * 30, // 30日
  }
);
```

### Q: データベースと連携するには？

**A:** [CUSTOMIZATION.md](./CUSTOMIZATION.md) の「データベース統合」セクションを参照してください。PostgreSQL + Drizzle ORM を使った実装例を掲載しています。

### Q: OAuth 認証を追加するには？

**A:** [CUSTOMIZATION.md](./CUSTOMIZATION.md) の「カスタム認証ロジック」セクションに GitHub OAuth の実装例があります。

### Q: 本番環境ではどうすればいい？

**A:** 以下の点に注意してください：

1. **環境変数の管理**
   - `JWT_SECRET` と `SHARED_SECRET` は安全な方法で管理（AWS Secrets Manager、Cloudflare Workers Secrets など）
   - 絶対にソースコードに含めないこと

2. **HTTPS の使用**
   - 本番環境では必ず HTTPS を使用
   - Cloudflare Workers は自動的に HTTPS を提供

3. **Cookie の設定**
   - `httpOnly: true` に加えて `secure: true` を設定
   - `sameSite: 'strict'` または `'lax'` を設定

4. **レート制限**
   - ログインエンドポイントにレート制限を実装
   - Cloudflare では自動的に DDoS 保護が提供される

詳細は [docs/guides/authentication.md](../../docs/guides/authentication.md) の「セキュリティのベストプラクティス」を参照してください。

### Q: リフレッシュトークンはどう使う？

**A:** アクセストークンの有効期限が切れた場合、リフレッシュトークンを使って新しいアクセストークンを取得します：

```typescript
// POST /auth/api/refresh
const response = await fetch('/auth/api/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken }),
});

const { accessToken, expiresIn } = await response.json();
```

詳細は [docs/guides/jwt-authentication.md](../../docs/guides/jwt-authentication.md) の「リフレッシュトークンの実装」を参照してください。

## トラブルシューティング

### ログインできない

**原因:**
- `.env` ファイルに `JWT_SECRET` が設定されていない
- デモ用認証情報が間違っている
- 開発サーバーが起動していない

**解決方法:**
1. `.env` ファイルが存在し、`JWT_SECRET` が設定されているか確認
   ```bash
   cat .env | grep JWT_SECRET
   ```
2. デモ用認証情報を確認（このREADME の「デモ用認証情報」セクション参照）
3. 開発サーバーが起動しているか確認
   ```bash
   pnpm dev
   ```

### "JWT_SECRET environment variable is required" エラー

**原因:**
- 環境変数が読み込まれていない
- `.env` ファイルが存在しない

**解決方法:**
1. `.env.example` をコピーして `.env` を作成
   ```bash
   cp .env.example .env
   ```
2. `.env` ファイルを編集して `JWT_SECRET` と `SHARED_SECRET` を設定
3. `pnpm dev` で起動（`tsx --env-file=.env` が自動的に実行される）

### "Invalid context signature" エラー

**原因:**
- 分離デプロイ時、`SHARED_SECRET` がパッケージ間で異なる

**解決方法:**
- すべてのパッケージで `SHARED_SECRET` 環境変数が同じ値になっているか確認
- Cloudflare Workers の場合、すべての Worker で同じ Secret を設定

### "Session expired" エラー

**原因:**
- アクセストークンの有効期限が切れている（デフォルト: 15分）

**解決方法:**
1. 再度ログインする
2. 有効期限を延長したい場合は `createTokenPair()` のオプションで変更
   ```typescript
   const tokens = await createTokenPair(payload, secret, {
     accessExpiresIn: 60 * 60, // 1時間に延長
   });
   ```

### "Unauthorized" エラー（Protected API）

**原因:**
- JWT トークンが送信されていない
- JWT トークンが無効または期限切れ
- `Authorization` ヘッダーの形式が間違っている

**解決方法:**
1. `Authorization: Bearer <token>` ヘッダーが正しく送信されているか確認
2. トークンの有効期限を確認（jwt.io でデコード可能）
3. 再度ログインして新しいトークンを取得

### より詳しいトラブルシューティング

以下のドキュメントも参照してください：

- **[docs/guides/jwt-authentication.md](../../docs/guides/jwt-authentication.md)** - JWT 認証のトラブルシューティングセクション
  - トークン検証エラーの原因と解決方法
  - 環境変数設定のトラブルシューティング
  - ローカル開発と分離デプロイの問題解決

- **[docs/guides/authentication.md](../../docs/guides/authentication.md)** - セキュリティのベストプラクティス
  - シークレットの管理方法
  - トークンの保存方法
  - エラーハンドリングのパターン

## ライセンス

MIT
