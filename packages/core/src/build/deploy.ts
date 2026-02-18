import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stat } from 'node:fs/promises';
import { scanPackages, resolvePackages } from '../scanner.js';
import type { DeployTarget, KagaribiConfig, ResolvedPackage } from '../types.js';
import type { BuildGroup } from './adapters/types.js';
import { createBuildPlan } from './planner.js';
import { getAdapter } from './adapters/index.js';
import { buildProject } from './index.js';
import { updateConfigSetDeployResult } from '../config-updater.js';

interface DeployProjectOptions {
  /** プロジェクトルートパス */
  projectRoot: string;
  /** 環境名 */
  environment?: string;
  /** 特定パッケージ名（指定しない場合は全パッケージ） */
  packageName?: string;
  /** デプロイターゲット（CLIフラグから） */
  target?: DeployTarget;
}

interface DeployResult {
  packageName: string;
  target: DeployTarget;
  url: string;
}

/**
 * kagaribi プロジェクトをデプロイする。
 *
 * Case 1: packageName + target → 特定パッケージを指定ターゲットにデプロイ
 * Case 2: target のみ → url未設定のパッケージを1つにまとめてデプロイ
 * Case 3: environment のみ → config設定に基づきデプロイ
 */
export async function deployProject(
  options: DeployProjectOptions
): Promise<DeployResult[]> {
  const { projectRoot, environment, packageName, target } = options;
  const packagesDir = resolve(projectRoot, 'packages');
  const distDir = resolve(projectRoot, 'dist');

  // config読み込み
  const config = await loadConfig(projectRoot);

  // パッケージスキャン + 解決
  const scanned = await scanPackages(packagesDir);
  const resolved = resolvePackages(scanned, config, environment);

  // ターゲットが指定されている場合、対応するパッケージのデプロイ設定を上書き
  const adjustedResolved = target
    ? adjustResolvedForTarget(resolved, packageName, target)
    : resolved;

  // BuildPlan 生成
  const plan = createBuildPlan(projectRoot, adjustedResolved, environment ?? 'default', config);

  // デプロイ対象グループを決定
  const groupsToDeploy = filterGroupsForDeploy(plan.groups, packageName, target);

  if (groupsToDeploy.length === 0) {
    console.log('No packages to deploy.');
    return [];
  }

  // dist/ がなければ自動ビルド
  const distExists = await stat(distDir)
    .then((s) => s.isDirectory())
    .catch(() => false);

  if (!distExists) {
    console.log('dist/ not found. Building first...\n');
    await buildProject({
      projectRoot,
      environment,
    });
  }

  // 各グループをデプロイ
  const results: DeployResult[] = [];

  for (const group of groupsToDeploy) {
    const adapter = getAdapter(group.target);

    console.log(`\nDeploying ${group.host.name} (${group.target})...`);

    const url = await adapter.deploy(distDir, group);

    console.log(`  ✓ Deployed: ${url}`);

    // config更新
    await updateConfigSetDeployResult(projectRoot, group.host.name, group.target, url);
    console.log(`  ✓ Updated kagaribi.config.ts`);

    results.push({
      packageName: group.host.name,
      target: group.target,
      url,
    });
  }

  return results;
}

/**
 * ターゲット指定がある場合、resolvedパッケージのデプロイ設定を調整する。
 */
function adjustResolvedForTarget(
  resolved: ResolvedPackage[],
  packageName: string | undefined,
  target: DeployTarget
): ResolvedPackage[] {
  if (packageName) {
    // 特定パッケージだけターゲットを変更
    return resolved.map((pkg) =>
      pkg.name === packageName
        ? { ...pkg, deploy: { ...pkg.deploy, target }, mode: 'remote' as const }
        : pkg
    );
  }

  // 全パッケージ: url未設定のパッケージのターゲットを変更
  return resolved.map((pkg) =>
    pkg.deploy.url
      ? pkg
      : { ...pkg, deploy: { ...pkg.deploy, target } }
  );
}

/**
 * デプロイ対象のグループをフィルタリングする。
 */
function filterGroupsForDeploy(
  groups: BuildGroup[],
  packageName: string | undefined,
  target: DeployTarget | undefined
): BuildGroup[] {
  if (packageName) {
    // 特定パッケージのグループだけ
    return groups.filter(
      (g) =>
        g.host.name === packageName ||
        g.colocated.some((p) => p.name === packageName)
    );
  }

  if (target) {
    // url未設定のグループ（既にデプロイ済みでないもの）
    return groups.filter((g) => !g.host.deploy.url);
  }

  // 全グループ
  return groups;
}

/**
 * kagaribi.config.ts を動的にインポートする。
 */
async function loadConfig(projectRoot: string): Promise<KagaribiConfig> {
  const configPath = resolve(projectRoot, 'kagaribi.config.ts');
  const module = await import(pathToFileURL(configPath).href);
  return module.default ?? module;
}
