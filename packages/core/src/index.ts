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
