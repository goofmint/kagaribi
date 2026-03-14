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

## トラブルシューティング

### ログインできない

- `.env` ファイルに `JWT_SECRET` が設定されているか確認
- デモ用認証情報が正しいか確認（README を参照）

### "Invalid context signature" エラー

- 分離デプロイ時、`SHARED_SECRET` がすべてのパッケージで同じ値になっているか確認

### "Session expired" エラー

- アクセストークンの有効期限が切れています。再度ログインしてください。
- 有効期限はデフォルトで 15 分です（`auth/src/index.ts` で変更可能）

## ライセンス

MIT
