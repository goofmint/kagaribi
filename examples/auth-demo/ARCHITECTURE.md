# Auth Demo - アーキテクチャ解説

このドキュメントでは、auth-demo の設計思想、各パッケージの役割、認証フローの詳細を解説します。

## 目次

- [全体アーキテクチャ](#全体アーキテクチャ)
- [パッケージ構成](#パッケージ構成)
- [認証フロー](#認証フロー)
- [データフロー](#データフロー)
- [デプロイモード](#デプロイモード)

---

## 全体アーキテクチャ

auth-demo は、3つの独立したパッケージで構成される認証システムのリファレンス実装です。

```
┌─────────────────────────────────────────────┐
│         Root Package (UI)                   │
│  - ログインフォーム (/login)                │
│  - ダッシュボード (/dashboard)              │
│  - Cookie ベースのセッション管理            │
└──────────┬────────────────┬─────────────────┘
           │                │
           │ getClient()    │ getClient()
           ▼                ▼
  ┌────────────────┐  ┌───────────────────┐
  │ Auth Package   │  │ Protected API Pkg │
  │                │  │                   │
  │ - POST /login  │  │ - GET /profile    │
  │ - POST /refresh│  │ - GET /secret     │
  │ - GET /verify  │  │                   │
  │                │  │ JWT 検証必須       │
  └────────────────┘  └───────────────────┘
           │                │
           └────────┬───────┘
                    │
    ┌───────────────▼───────────────┐
    │    Kagaribi Core Services     │
    ├───────────────────────────────┤
    │ • JWT 生成・検証               │
    │ • コンテキスト伝播             │
    │ • パッケージマウント           │
    │ • RPC クライアント             │
    └───────────────────────────────┘
```

### 設計原則

1. **Single Responsibility**: 各パッケージは明確な責任を持つ
2. **Stateless Authentication**: JWT によるステートレス認証
3. **Separation of Concerns**: UI、認証、ビジネスロジックの分離
4. **Transparency**: ローカル/リモートデプロイを透過的に切り替え

---

## パッケージ構成

### 1. Root Package

**責任**: ユーザーインターフェースとセッション管理

**主な機能**:
- ログインフォームの表示
- ダッシュボードの表示
- Cookie による認証状態管理
- auth と protected-api パッケージへの RPC 呼び出し

**ファイル構造**:
```
packages/root/
├── kagaribi.package.ts    # dependencies: ['auth', 'protected-api']
├── package.json
└── src/
    └── index.tsx          # Hono JSX による UI 実装
```

**ルート**:
- `GET /` → `/login` へリダイレクト
- `GET /login` → ログインフォーム表示
- `POST /login` → auth パッケージへ認証リクエスト
- `GET /dashboard` → ダッシュボード表示（認証必須）
- `GET /api/secret` → protected-api へのプロキシ
- `POST /logout` → Cookie を削除してログアウト

**依存関係**:
```typescript
import { getClient } from '@kagaribi/core';
import type authApp from '../../auth/src/index.js';
import type protectedApiApp from '../../protected-api/src/index.js';

// 型安全な RPC 呼び出し
const authClient = getClient<typeof authApp>('auth');
const apiClient = getClient<typeof protectedApiApp>('protected-api');
```

---

### 2. Auth Package

**責任**: 認証とトークン管理

**主な機能**:
- ユーザー認証
- JWT トークンの発行
- リフレッシュトークンによるトークン再発行
- トークンの検証

**ファイル構造**:
```
packages/auth/
├── kagaribi.package.ts    # dependencies: なし
├── package.json
└── src/
    └── index.ts           # 認証エンドポイント
```

**ルート**:
- `POST /auth/api/login` → ユーザー認証とトークン発行
- `POST /auth/api/refresh` → リフレッシュトークン再発行
- `GET /auth/api/verify` → トークン検証

**使用する Kagaribi 機能**:
```typescript
import { createTokenPair, JWT_DEFAULTS, sign, verify, jwt } from '@kagaribi/core';

// トークンペア生成
const { accessToken, refreshToken, expiresIn } = await createTokenPair(
  { sub: user.id, user },
  JWT_SECRET
);
```

**デモユーザー**:
```typescript
const DEMO_USERS = [
  { id: 'user1', email: 'alice@example.com', password: 'password123', name: 'Alice' },
  { id: 'user2', email: 'bob@example.com', password: 'password456', name: 'Bob' },
];
```

---

### 3. Protected API Package

**責任**: 認証が必要なビジネスロジック API

**主な機能**:
- JWT 検証
- 認証済みユーザーのプロフィール取得
- 保護されたデータの提供

**ファイル構造**:
```
packages/protected-api/
├── kagaribi.package.ts    # dependencies: ['auth']
├── package.json
└── src/
    └── index.ts           # Protected API エンドポイント
```

**ルート**:
- `GET /api/profile` → ユーザープロフィール
- `GET /api/secret` → シークレットデータ

**認証ミドルウェア**:
```typescript
import { jwt, getAuthPayloadFromContext, kagaribiContextMiddleware } from '@kagaribi/core';

// FaaS 分離デプロイ時のコンテキスト復元
app.use('*', kagaribiContextMiddleware(SHARED_SECRET));

// JWT 検証
app.use('*', jwt({ secret: JWT_SECRET, alg: 'HS256' }));

// ペイロード取得
app.get('/profile', (c) => {
  const payload = getAuthPayloadFromContext(c);
  const user = c.get('user') || payload.user;
  return c.json({ user });
});
```

---

## 認証フロー

### 1. ログインフロー

```
[Browser]
   │
   │ 1. GET /login
   ▼
[Root Package]
   │
   │ 2. ログインフォーム表示
   │
   ◄─ Email: alice@example.com
   ◄─ Password: password123
   │
   │ 3. POST /login
   ▼
[Root Package]
   │
   │ 4. POST /auth/api/login (getClient)
   ▼
[Auth Package]
   │
   │ 5. ユーザー認証
   │ 6. createTokenPair()
   │
   ▼ {accessToken, refreshToken, user}
[Root Package]
   │
   │ 7. Cookie に accessToken を保存
   │ 8. /dashboard へリダイレクト
   ▼
[Browser]
```

**詳細**:

1. ユーザーが `/login` にアクセス
2. Root が Hono JSX でログインフォームを表示
3. ユーザーがフォームを送信（POST `/login`）
4. Root が `getClient('auth')` で auth パッケージの `/auth/api/login` を呼び出し
5. Auth パッケージがデモユーザーデータで認証
6. Auth が `createTokenPair()` でトークンペアを生成
7. Root が `setCookie(c, 'accessToken', ...)` で Cookie に保存
8. Root が `/dashboard` へリダイレクト

---

### 2. ダッシュボードアクセスフロー

```
[Browser]
   │ Cookie: accessToken=eyJhbGci...
   │
   │ 1. GET /dashboard
   ▼
[Root Package]
   │
   │ 2. getCookie('accessToken')
   │ 3. GET /api/profile (getClient)
   │    Authorization: Bearer <token>
   ▼
[Protected API Package]
   │
   │ 4. kagaribiContextMiddleware
   │    (分離デプロイ時のみ)
   │
   │ 5. jwt() ミドルウェア
   │    → JWT 検証
   │
   │ 6. getAuthPayloadFromContext(c)
   │    → ユーザー情報取得
   │
   ▼ {user: {id, email, name}}
[Root Package]
   │
   │ 7. ダッシュボード HTML 生成
   │    (Hono JSX)
   ▼
[Browser]
```

**詳細**:

1. ユーザーが `/dashboard` にアクセス（Cookie 付き）
2. Root が Cookie から `accessToken` を取得
3. Root が `getClient('protected-api')` で `/api/profile` を呼び出し
   - `Authorization: Bearer <token>` ヘッダーを付与
4. Protected API が `kagaribiContextMiddleware` で署名付きコンテキストを検証（分離デプロイ時）
5. Protected API が `jwt()` ミドルウェアでトークンを検証
6. Protected API が `getAuthPayloadFromContext(c)` でペイロードを取得
7. Root が Hono JSX でダッシュボード HTML を生成（ユーザー情報を表示）
8. ブラウザにレスポンス

---

### 3. リフレッシュトークンフロー

```
[Browser]
   │ accessToken 有効期限切れ (15分経過)
   │ refreshToken は有効 (7日以内)
   │
   │ POST /auth/api/refresh
   │ {refreshToken: "eyJhbGci..."}
   ▼
[Auth Package]
   │
   │ 1. verify(refreshToken, JWT_SECRET)
   │ 2. payload.type === 'refresh' 確認
   │ 3. ユーザー情報取得
   │ 4. 新しい accessToken 生成
   │
   ▼ {accessToken, expiresIn}
[Browser]
   │
   │ 新しい accessToken で再リクエスト
   ▼
```

---

## データフロー

### ローカル開発モード

```
[HTTP Request]
   │
   ▼
[serve.ts - mountAllLocal()]
   │
   ├─ / → rootApp
   ├─ /auth → authApp
   └─ /api → protectedApiApp
   │
   │ 同一プロセス内で動作
   │ c.set() / c.get() で直接コンテキスト共有
   ▼
[HTTP Response]
```

**特徴**:
- すべてのパッケージが同一プロセス
- `getClient()` は内部的に直接関数呼び出し
- コンテキストは Hono の `c.set()` / `c.get()` で共有
- デバッグが容易

---

### 分離デプロイモード（Production）

```
[HTTP Request]
   │
   ▼
┌─────────────────────────────────┐
│   Root Package (Node.js)        │
│   - HTTP リクエスト受信          │
│   - Cookie 管理                  │
│   - UI レンダリング              │
└────────┬────────────────────────┘
         │
         │ getClient('auth')
         │ → fetch(AUTH_SERVICE_URL)
         ▼
┌─────────────────────────────────┐
│   Auth Package (CF Workers)     │
│   - JWT 生成                     │
│   - ユーザー認証                 │
└─────────────────────────────────┘
         │
         │ getClient('protected-api')
         │ → fetch(PROTECTED_API_URL)
         │    + X-Kagaribi-Context
         │    + X-Kagaribi-Signature
         ▼
┌─────────────────────────────────┐
│ Protected API (CF Workers)      │
│   - kagaribiContextMiddleware   │
│     → 署名検証・復元             │
│   - jwt() ミドルウェア           │
│   - ビジネスロジック             │
└─────────────────────────────────┘
```

**特徴**:
- パッケージごとに異なるランタイム環境
- `getClient()` は自動的に HTTP リクエストに変換
- コンテキストは `X-Kagaribi-Context` ヘッダーで伝播
- HMAC-SHA256 署名で改ざん防止

---

## デプロイモード

### ローカル開発

**設定** (`kagaribi.config.ts`):
```typescript
export default defineConfig({
  packages: {
    root: { target: 'node' },
    auth: { target: 'node' },
    'protected-api': { target: 'node' },
  },
});
```

**起動方法**:
```bash
pnpm dev
# → tsx --env-file=.env serve.ts
```

**メリット**:
- 1つのプロセスで全パッケージが動作
- ホットリロード対応
- デバッグが容易

---

### Production 環境

**設定** (`kagaribi.config.ts`):
```typescript
export default defineConfig({
  packages: {
    // ...
  },
  environments: {
    production: {
      packages: {
        auth: {
          target: 'cloudflare-workers',
          url: '$AUTH_SERVICE_URL',
        },
        'protected-api': {
          target: 'cloudflare-workers',
          url: '$PROTECTED_API_URL',
        },
        root: {
          target: 'node',
        },
      },
    },
  },
});
```

**デプロイ方法**:
```bash
# ビルド
kagaribi build --env production

# デプロイ
kagaribi deploy auth cloudflare-workers
kagaribi deploy protected-api cloudflare-workers
# root は別サーバーにデプロイ
```

**メリット**:
- 独立したスケーリング
- 異なるランタイムを選択可能
- 障害の分離

---

## セキュリティ設計

### 1. トークンの署名

- **アルゴリズム**: HS256（HMAC-SHA256）
- **シークレット**: 環境変数 `JWT_SECRET`
- **有効期限**:
  - アクセストークン: 15分
  - リフレッシュトークン: 7日

### 2. コンテキスト伝播の署名

- **署名方式**: HMAC-SHA256
- **シークレット**: 環境変数 `SHARED_SECRET`
- **ヘッダー**:
  - `X-Kagaribi-Context`: JSON エンコードされたコンテキスト
  - `X-Kagaribi-Signature`: HMAC 署名

### 3. Cookie の設定

```typescript
setCookie(c, 'accessToken', token, {
  path: '/',
  httpOnly: true,  // XSS 対策
  maxAge: expiresIn,
});
```

---

## まとめ

auth-demo は、Kagaribi の認証機能を実践的に示すリファレンス実装です：

- ✅ 3パッケージ構成（UI、認証、API）
- ✅ JWT による ステートレス認証
- ✅ リフレッシュトークンによる長期セッション
- ✅ コンテキスト伝播による FaaS 分離デプロイ対応
- ✅ セキュアな設計（署名、httpOnly Cookie）

このアーキテクチャを参考に、独自の認証システムを構築してください。
