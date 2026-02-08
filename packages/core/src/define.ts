import type { KagaribiConfig, PackageDefinition } from './types.js';

/**
 * kagaribi.config.ts で使用する設定定義関数。
 * 型補完を提供するためのヘルパー。
 */
export function defineConfig(config: KagaribiConfig): KagaribiConfig {
  return config;
}

/**
 * kagaribi.package.ts で使用するパッケージ定義関数。
 * 型補完を提供するためのヘルパー。
 */
export function definePackage(definition: PackageDefinition): PackageDefinition {
  return definition;
}
