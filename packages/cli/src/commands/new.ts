import { scaffoldPackage, updateConfigAddPackage } from '@kagaribi/core';
import type { DeployTarget, PackageDeployConfig } from '@kagaribi/core';

interface NewOptions {
  /** パッケージ名 */
  name: string;
  /** デプロイターゲット（指定しない場合はcolocateWith: 'root'） */
  target?: DeployTarget;
}

/**
 * kagaribi new コマンド。
 * 新しいパッケージのスキャフォールドとconfig更新を行う。
 */
export async function newCommand(options: NewOptions): Promise<void> {
  const projectRoot = process.cwd();
  const { name, target } = options;

  // 1. パッケージディレクトリ + テンプレート生成
  console.log(`Creating package "${name}"...`);
  await scaffoldPackage({ projectRoot, name, target });

  // 2. kagaribi.config.ts に追加
  const config: PackageDeployConfig = target
    ? { target }
    : { colocateWith: 'root' };

  await updateConfigAddPackage(projectRoot, {
    packageName: name,
    config,
  });

  console.log(`\n✓ Package "${name}" created successfully!`);
  console.log(`  packages/${name}/kagaribi.package.ts`);
  console.log(`  packages/${name}/src/index.ts`);
  console.log(`  kagaribi.config.ts updated`);
}
