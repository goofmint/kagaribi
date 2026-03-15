// 定義ヘルパー
export { defineConfig, definePackage } from './define.js';

// 型
export type {
  DbDialect,
  SqliteDriver,
  DeployTarget,
  PackageDefinition,
  PackageDeployConfig,
  EnvironmentConfig,
  KagaribiConfig,
  ResolvedPackage,
  RegisteredPackage,
  JWTPayload,
  AuthUser,
  KagaribiJwtPayload,
  AuthContext,
} from './types.js';

// パッケージスキャン
export { scanPackages, resolvePackages, resolveEnvVar } from './scanner.js';

// マウント
export { mountPackages, mountAllLocal } from './mount.js';

// プロキシ
export { proxyMiddleware } from './proxy.js';

// クライアント
export {
  registerLocalClient,
  registerRemoteClient,
  getClient,
  clearClientRegistry,
} from './client.js';

// コード生成
export { generateCode } from './codegen.js';

// コンテキスト伝播
export {
  kagaribiContextMiddleware,
  createContextHeaders,
} from './context.js';

// パスパラメータ伝播
export { kagaribiParamsMiddleware } from './params.js';

// 環境変数ユーティリティ
export { requireEnv } from './utils/env.js';

// JWT 認証統合
export {
  jwt,
  sign,
  verify,
  decode,
  getAuthPayloadFromContext,
  createAuthContextHeaders,
  JWT_DEFAULTS,
  createTokenPair,
} from './jwt.js';

// プロジェクト初期化
export { initProject } from './init.js';

// スキャフォールド
export { scaffoldPackage } from './scaffold.js';

// config更新
export { updateConfigAddPackage, updateConfigSetDeployResult } from './config-updater.js';

// ビルド
export { buildProject } from './build/index.js';
export { createBuildPlan } from './build/planner.js';
export { getAdapter } from './build/adapters/index.js';
export type {
  BuildGroup,
  BuildPlan,
  BuildAdapter,
  GeneratedFile,
} from './build/adapters/types.js';

// デプロイ
export { deployProject } from './build/deploy.js';

// DB テンプレート
export {
  getDbDependencies,
  generateDbSchema,
  generateDbIndex,
  generateDrizzleConfig,
  generateEnvExample,
  getDbExternals,
} from './db.js';

// DB ミドルウェア
export { createDbMiddleware } from './db-middleware.js';
export type { DbMiddlewareOptions } from './db-middleware.js';

// DB ヘルパー
export { createDbHelper } from './db-helper.js';

// DB ファクトリー
export { createDb, initGlobalDb, getGlobalDb } from './db-factory.js';

// Model ベースクラス
export { ModelBase } from './model-base.js';

// シェル実行
export { exec } from './build/exec.js';

// モデル生成
export {
  getColumnDefinition,
  generateTableDefinition,
  appendModelToSchema,
  parseFieldDefinitions,
  detectDbDialect,
  detectDbConfig,
  generateModelHelper,
  writeModelHelper,
  updateModelIndex,
  SUPPORTED_FIELD_TYPES,
} from './model.js';
export type { SupportedFieldType, FieldDefinition, TableDefinition, DbConfig } from './model.js';
