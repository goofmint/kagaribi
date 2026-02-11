import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { scanPackages, resolvePackages } from '../scanner.js';
import type { KagaribiConfig } from '../types.js';
import type { BuildGroup, BuildPlan } from './adapters/types.js';
import { createBuildPlan } from './planner.js';
import { generateBuildCode } from './codegen.js';
import { getAdapter } from './adapters/index.js';
import { bundlePackage } from './bundler.js';
import { getDbExternals } from '../db.js';

interface BuildProjectOptions {
  /** プロジェクトルートパス */
  projectRoot: string;
  /** 環境名（kagaribi.config.tsのenvironmentsキー） */
  environment?: string;
  /** 出力ディレクトリ（デフォルト: 'dist'） */
  outDir?: string;
}

/**
 * kagaribi プロジェクトをビルドする。
 *
 * 1. kagaribi.config.ts を読み込み
 * 2. パッケージをスキャン・解決
 * 3. BuildPlan を生成
 * 4. 各 BuildGroup を並列ビルド
 */
export async function buildProject(options: BuildProjectOptions): Promise<void> {
  const { projectRoot, environment, outDir: outDirName = 'dist' } = options;
  const packagesDir = resolve(projectRoot, 'packages');
  const outDir = resolve(projectRoot, outDirName);

  // 1. kagaribi.config.ts を読み込み
  const config = await loadConfig(projectRoot);

  // 2. パッケージスキャン + 解決
  const scanned = await scanPackages(packagesDir);
  const resolved = resolvePackages(scanned, config, environment);

  // 3. BuildPlan 生成
  const plan = createBuildPlan(projectRoot, resolved, environment ?? 'default');

  console.log(`Building ${plan.groups.length} group(s) for "${plan.environment}" environment...`);

  // 4. 各グループを並列ビルド
  const dbExternals = config.db ? getDbExternals(config.db.dialect) : [];
  await Promise.all(
    plan.groups.map((group) => buildGroup(group, plan, outDir, dbExternals))
  );

  console.log(`Build completed! Output: ${outDir}`);
}

/**
 * 1つのBuildGroupをビルドする。
 */
async function buildGroup(
  group: BuildGroup,
  plan: BuildPlan,
  outDir: string,
  dbExternals: string[] = []
): Promise<void> {
  const groupOutDir = resolve(outDir, group.host.name);
  await mkdir(groupOutDir, { recursive: true });

  const adapter = getAdapter(group.target);
  const colocatedNames = group.colocated.map((p) => p.name);

  console.log(
    `  ${group.host.name} (${group.target})` +
      (colocatedNames.length > 0 ? ` [+ ${colocatedNames.join(', ')}]` : '')
  );

  // 1. アプリ統合コード生成
  const { appPath } = await generateBuildCode(group, plan.projectRoot);

  // 2. アダプタのエントリーポイント生成
  const entryDir = resolve(plan.projectRoot, '.kagaribi', 'build', group.host.name);
  const entryContent = adapter.generateEntry(group, './app.ts');
  const entryPath = resolve(entryDir, 'entry.ts');
  await writeFile(entryPath, entryContent, 'utf-8');

  // 3. esbuild でバンドル
  await bundlePackage({
    entryPoint: entryPath,
    outfile: resolve(groupOutDir, 'index.js'),
    target: group.target,
    external: dbExternals.length > 0 ? dbExternals : undefined,
  });

  // 4. 追加設定ファイル（wrangler.toml, Dockerfile等）を出力
  const configs = adapter.generateConfigs(group);
  await Promise.all(
    configs.map((file) =>
      writeFile(resolve(groupOutDir, file.filename), file.content, 'utf-8')
    )
  );
}

/**
 * kagaribi.config.ts を動的にインポートする。
 */
async function loadConfig(projectRoot: string): Promise<KagaribiConfig> {
  const configPath = resolve(projectRoot, 'kagaribi.config.ts');
  const module = await import(configPath);
  return module.default ?? module;
}
