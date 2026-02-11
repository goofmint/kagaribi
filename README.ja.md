# kagaribi (篝火)

Honoベースのマイクロサービス管理フレームワーク。モノレポ内でパッケージとして開発し、Cloudflare Workers / AWS Lambda / Google Cloud Run / Deno Deploy / Node.js に個別デプロイできます。

## 特徴

- **パッケージベース設計** - 機能ごとにディレクトリを分割し、独立したHonoアプリとして開発
- **透過的なRPC** - `getClient()` でローカル/リモートを意識せず型安全にパッケージ間通信
- **マルチターゲットデプロイ** - 1つのコードベースから複数のクラウドプラットフォームへデプロイ
- **co-location** - 開発時は全パッケージを単一プロセスで実行、本番は必要に応じて分離
- **ネストルーティング** - `/users/:userId/articles` のようなパッケージ横断パスパターン対応
- **WebComponent UI** - 各パッケージがAPI + UIの両方を提供可能
- **データベースサポート** - Drizzle ORMによるPostgreSQL/MySQL統合機能を内蔵

## 必要環境

- Node.js >= 22.6.0
- pnpm

## クイックスタート

### 1. プロジェクト作成

```bash
# 新しいプロジェクトを作成
kagaribi init my-project

# ターゲット指定で作成
kagaribi init my-project --cloudflare

# データベース付きで作成（PostgreSQL）
kagaribi init my-blog --db postgresql
```

以下の構造が自動生成されます:

```
my-project/
  package.json              # 依存関係とスクリプト
  kagaribi.config.ts        # デプロイ設定
  tsconfig.json             # TypeScript設定
  .gitignore                # 除外パターン
  packages/
    root/                   # ルートパッケージ（必須）
      kagaribi.package.ts
      src/index.ts
```

依存インストール後、すぐに開発サーバーを起動できます:

```bash
cd my-project
kagaribi dev        # http://localhost:3000
```

### 2. 設定ファイル

```typescript
// kagaribi.config.ts
import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    root: { target: 'node' },
    auth: { colocateWith: 'root' },
    users: { colocateWith: 'root' },
  },
  environments: {
    development: {
      packages: {
        '*': { colocateWith: 'root' },  // 開発時は全てローカル
      },
    },
    production: {
      packages: {
        users: { target: 'aws-lambda', url: '$USERS_URL' },
      },
    },
  },
});
```

### 3. パッケージの作成

```bash
# 新しいパッケージを作成（rootにco-locate）
kagaribi new payments

# ターゲット指定で作成
kagaribi new payments --cloudflare
```

生成されるファイル:

```typescript
// packages/payments/kagaribi.package.ts
import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'payments',
  runtime: ['node', 'cloudflare-workers', 'deno'],
});
```

```typescript
// packages/payments/src/index.ts
import { Hono } from 'hono';

const app = new Hono()
  .get('/', (c) => {
    return c.json({ message: 'Hello from payments' });
  });

export type PaymentsApp = typeof app;
export default app;
```

### 4. 開発サーバー

```bash
kagaribi dev        # http://localhost:3000
kagaribi dev 8080   # ポート指定
```

全パッケージが単一プロセスで起動し、ローカルルーティングで動作します。

## CLIコマンド一覧

| コマンド | 説明 |
|----------|------|
| `kagaribi init <name> [target flag]` | 新規プロジェクト作成 |
| `kagaribi dev [port]` | 開発サーバー起動 |
| `kagaribi new <name> [target flag]` | 新規パッケージ作成 |
| `kagaribi build [--env name]` | デプロイ用ビルド |
| `kagaribi deploy [pkg] [target flag] [--env]` | デプロイ実行 |

### ターゲットフラグ

| フラグ | ターゲット |
|--------|-----------|
| `--cloudflare` | Cloudflare Workers |
| `--lambda` | AWS Lambda |
| `--cloudrun` | Google Cloud Run |
| `--deno` | Deno Deploy |
| `--node` | Node.js |

## パッケージ間通信（RPC）

`getClient()` を使って他のパッケージを型安全に呼び出せます:

```typescript
import { getClient } from '@kagaribi/core';
import type { UsersApp } from '../../users/src/index.js';

// ローカルでもリモートでも同じインターフェース
const users = getClient<UsersApp>('users');
const res = await users.api.users.$get();
const data = await res.json();
```

パッケージのソースコードはモノレポ内に常に存在するため、リモートデプロイされたパッケージに対しても完全な型安全性が維持されます。

## デプロイ

### 特定パッケージのデプロイ

```bash
# usersパッケージをCloud Runにデプロイ
kagaribi deploy users --cloudrun

# authパッケージをCloudflareにデプロイ
kagaribi deploy auth --cloudflare
```

デプロイ後、`kagaribi.config.ts` が自動的に更新されます:

```typescript
// デプロイ前
users: { colocateWith: 'root' },

// デプロイ後（自動更新）
users: { target: 'google-cloud-run', url: 'https://users-xxx.run.app' },
```

### 一括デプロイ

```bash
# 未デプロイのパッケージをまとめてCloudflareにデプロイ
kagaribi deploy --cloudflare
```

既にリモートデプロイ済み（url設定あり）のパッケージはスキップされ、残りが1つのデプロイユニットにまとめられます。

### 環境別デプロイ

```bash
# production環境の設定に基づいてデプロイ
kagaribi deploy --env production
```

## ネストルーティング

パッケージ横断のパスパターンを定義できます:

```typescript
// packages/articles/kagaribi.package.ts
export default definePackage({
  name: 'articles',
  dependencies: ['users'],
  routes: ['/users/:userId/articles'],
});
```

パスパラメータはミドルウェアで取得:

```typescript
import { kagaribiParamsMiddleware } from '@kagaribi/core';

app.use('*', kagaribiParamsMiddleware());
app.get('/', (c) => {
  const userId = c.get('userId' as never) as string;
  return c.json({ userId, articles: [] });
});
```

## データベースサポート

`--db` フラグでプロジェクトを作成すると、Drizzle ORMによるデータベースサポートが自動セットアップされます。

### データベース付きプロジェクトの作成

```bash
# PostgreSQLプロジェクトを作成
kagaribi init my-blog --db postgresql
cd my-blog

# データベース接続を設定
cp .env.example .env
# .env を編集して DATABASE_URL を追加

# マイグレーション実行と開発サーバー起動
pnpm run db:migrate
pnpm run dev
```

### 自動生成されるファイル

- `db/schema.ts` - Drizzle ORMスキーマ定義
- `db/index.ts` - データベース接続ヘルパー
- `drizzle.config.ts` - Drizzle Kit設定
- `.env.example` - 環境変数サンプル

### 利用可能なスクリプト

| スクリプト | 説明 |
|-----------|------|
| `build:db` | `db/*.ts` を `db/*.js` にコンパイル |
| `dev` | dbをビルドして開発サーバー起動 |
| `db:generate` | スキーマからマイグレーションファイル生成 |
| `db:migrate` | マイグレーションをデータベースに適用 |
| `db:studio` | Drizzle Studio（DBのGUI）を起動 |

### データベース接続ヘルパー

`createDbHelper` を使ってシングルトンパターンで接続を管理：

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { createDbHelper } from '@kagaribi/core';
import * as schema from './schema.js';

const { initDb, getDb } = createDbHelper((url) => drizzle(url, { schema }));

export { initDb, getDb, schema };
```

### データベースミドルウェア

`createDbMiddleware` で環境に応じた自動初期化：

```typescript
import { Hono } from 'hono';
import { createDbMiddleware } from '@kagaribi/core';
import { getDb, initDb } from '../../../db/index.js';

const app = new Hono()
  .use('*', createDbMiddleware({ initFn: initDb }))
  .get('/', async (c) => {
    const db = getDb();
    // データベース操作
    return c.json({ data });
  });
```

**ミドルウェアが自動的に:**
- Node.js環境では `process.env.DATABASE_URL` を読み込み
- Cloudflare Workers環境では `c.env.DATABASE_URL` を読み込み
- 冪等な初期化（重複初期化を防止）

詳細は [Usage Guide](./USAGE.md) を参照してください。

## ビルド出力

```bash
kagaribi build --env production
```

```text
dist/
  root/
    index.js           # バンドル済みアプリ
    wrangler.toml      # Cloudflareの場合
    Dockerfile         # Cloud Runの場合
  users/
    index.js
```

## 設定リファレンス

### PackageDeployConfig

| フィールド | 型 | 説明 |
|-----------|------|------|
| `target` | `DeployTarget` | デプロイ先: `'node'`, `'cloudflare-workers'`, `'aws-lambda'`, `'google-cloud-run'`, `'deno'` |
| `colocateWith` | `string` | 同居先パッケージ名（例: `'root'`） |
| `url` | `string` | リモートURL。`$ENV_VAR` で環境変数参照 |

### PackageDefinition

| フィールド | 型 | 説明 |
|-----------|------|------|
| `name` | `string` | パッケージ名（必須） |
| `dependencies` | `string[]` | 依存するkagaribiパッケージ |
| `routes` | `string[]` | ネストルーティングパターン |
| `runtime` | `DeployTarget[]` | 対応ランタイム |

## アーキテクチャ

```text
クライアント → Root パッケージ（認証・ルーティング）
                    │
                    ├─ ローカル: app.route() で直接マウント
                    │
                    └─ リモート: proxyMiddleware でHTTPプロキシ
                         → AWS Lambda / Cloud Run / Workers
```

- **開発時**: 全パッケージが `app.route()` でマウントされ、単一プロセスで動作
- **本番**: 設定に基づき、一部をリモートデプロイし `proxyMiddleware` で中継
- **RPC**: `hc()` + カスタムfetchでローカル/リモートを透過的に切り替え
