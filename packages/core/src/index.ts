// 定義ヘルパー
export { defineConfig, definePackage } from './define.js';

// 型
export type {
  DeployTarget,
  PackageDefinition,
  PackageDeployConfig,
  EnvironmentConfig,
  KagaribiConfig,
  ResolvedPackage,
  RegisteredPackage,
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

// シェル実行
export { exec } from './build/exec.js';
