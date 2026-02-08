import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type {
  KagaribiConfig,
  PackageDefinition,
  PackageDeployConfig,
  ResolvedPackage,
} from './types.js';

/**
 * packages/ ディレクトリを走査し、kagaribi.package.ts を持つパッケージを検出する。
 */
export async function scanPackages(
  packagesDir: string
): Promise<Map<string, { path: string; definition: PackageDefinition }>> {
  const packages = new Map<
    string,
    { path: string; definition: PackageDefinition }
  >();

  const entries = await readdir(packagesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pkgDir = resolve(packagesDir, entry.name);
    const manifestPath = join(pkgDir, 'kagaribi.package.ts');

    const manifestExists = await stat(manifestPath)
      .then((s) => s.isFile())
      .catch(() => false);

    if (!manifestExists) continue;

    // マニフェストを動的インポート
    const manifestModule = await import(manifestPath);
    const definition: PackageDefinition =
      manifestModule.default ?? manifestModule;

    packages.set(definition.name, {
      path: pkgDir,
      definition,
    });
  }

  return packages;
}

/**
 * 設定ファイルとスキャン結果を突き合わせて、
 * 各パッケージの解決済み情報を返す。
 */
export function resolvePackages(
  scanned: Map<string, { path: string; definition: PackageDefinition }>,
  config: KagaribiConfig,
  environment?: string
): ResolvedPackage[] {
  const resolved: ResolvedPackage[] = [];

  // 環境別オーバーライドをマージ
  const envOverrides: Record<string, PackageDeployConfig> | undefined =
    environment ? config.environments?.[environment]?.packages : undefined;

  for (const [name, pkg] of scanned) {
    // ワイルドカード設定と個別設定をマージ
    const baseConfig = config.packages[name] ?? {};
    const wildcardOverride = envOverrides?.['*'] ?? {};
    const specificOverride = envOverrides?.[name] ?? {};

    const deploy: PackageDeployConfig = {
      ...baseConfig,
      ...wildcardOverride,
      ...specificOverride,
    };

    const mode = deploy.colocateWith ? 'local' : deploy.url ? 'remote' : 'local';

    resolved.push({
      name,
      path: pkg.path,
      definition: pkg.definition,
      deploy,
      mode,
    });
  }

  return resolved;
}

/**
 * 環境変数参照（$ENV_VAR形式）を実際の値に展開する。
 */
export function resolveEnvVar(value: string): string {
  if (value.startsWith('$')) {
    const envName = value.slice(1);
    const envValue = process.env[envName];
    if (envValue === undefined) {
      throw new Error(
        `Environment variable "${envName}" is not set (referenced as "${value}")`
      );
    }
    return envValue;
  }
  return value;
}
