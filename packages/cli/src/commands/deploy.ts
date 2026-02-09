import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import { scanPackages, resolvePackages } from '@kagaribi/core';
import { createBuildPlan, getAdapter, deployProject } from '@kagaribi/core';
import type { DeployTarget } from '@kagaribi/core';

interface DeployOptions {
  /** 特定パッケージのみ */
  packageName?: string;
  /** 環境名 */
  env?: string;
  /** デプロイターゲット（CLIフラグから） */
  target?: DeployTarget;
  /** ドライランモード */
  dryRun?: boolean;
}

/**
 * kagaribi deploy コマンド。
 * target指定あり → 実デプロイ
 * target/envなし → ドライラン（手順表示のみ）
 */
export async function deployCommand(options: DeployOptions): Promise<void> {
  const hasTarget = Boolean(options.target);
  const hasEnv = Boolean(options.env);
  const isDryRun = options.dryRun || (!hasTarget && !hasEnv);

  if (isDryRun) {
    await showDeployInstructions(options);
  } else {
    await executeDeployment(options);
  }
}

/**
 * 実デプロイの実行。
 */
async function executeDeployment(options: DeployOptions): Promise<void> {
  const projectRoot = process.cwd();

  console.log('Starting deployment...\n');

  const results = await deployProject({
    projectRoot,
    environment: options.env,
    packageName: options.packageName,
    target: options.target,
  });

  if (results.length === 0) {
    console.log('No packages were deployed.');
    return;
  }

  console.log('\n--- Deploy Summary ---');
  for (const result of results) {
    console.log(`  ${result.packageName} (${result.target}): ${result.url}`);
  }
}

/**
 * ドライラン: デプロイ手順を表示する（従来の動作）。
 */
async function showDeployInstructions(options: DeployOptions): Promise<void> {
  const projectRoot = process.cwd();
  const packagesDir = resolve(projectRoot, 'packages');
  const distDir = resolve(projectRoot, 'dist');

  // dist/ の存在チェック
  const distExists = await stat(distDir)
    .then((s) => s.isDirectory())
    .catch(() => false);

  if (!distExists) {
    console.error('Error: dist/ directory not found. Run "kagaribi build" first.');
    process.exit(1);
  }

  // config読み込み
  const configPath = resolve(projectRoot, 'kagaribi.config.ts');
  const configModule = await import(configPath);
  const config = configModule.default ?? configModule;

  // パッケージスキャン + 解決
  const scanned = await scanPackages(packagesDir);
  const resolved = resolvePackages(scanned, config, options.env);

  // BuildPlan 生成
  const plan = createBuildPlan(projectRoot, resolved, options.env ?? 'default');

  console.log('Deploy instructions:\n');

  for (const group of plan.groups) {
    // 特定パッケージが指定されている場合はフィルタ
    if (options.packageName) {
      const isHost = group.host.name === options.packageName;
      const isColocated = group.colocated.some((p) => p.name === options.packageName);
      if (!isHost && !isColocated) {
        continue;
      }
    }

    const adapter = getAdapter(group.target);
    const distPath = resolve(distDir, group.host.name, 'index.js');
    const exists = await stat(distPath)
      .then((s) => s.isFile())
      .catch(() => false);

    const status = exists ? 'ready' : 'not built';
    const colocatedNames = group.colocated.map((p) => p.name);

    console.log(`  ${group.host.name} (${group.target}) [${status}]`);
    if (colocatedNames.length > 0) {
      console.log(`    Includes: ${colocatedNames.join(', ')}`);
    }
    console.log(`    ${adapter.deployInstructions(group)}`);
    console.log('');
  }
}
