import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import type { DeployTarget, PackageDeployConfig } from './types.js';

interface ConfigUpdateEntry {
  packageName: string;
  config: PackageDeployConfig;
}

/**
 * packages: { ... } ブロック内の開始・終了位置を特定する。
 * ブレースカウント方式で対応する閉じブレースを見つける。
 */
function findPackagesBlock(content: string): { start: number; end: number } {
  const packagesIdx = content.indexOf('packages:');
  if (packagesIdx === -1) {
    throw new Error('Could not find "packages:" in kagaribi.config.ts');
  }

  const openBrace = content.indexOf('{', packagesIdx);
  if (openBrace === -1) {
    throw new Error('Could not find opening brace after "packages:"');
  }

  let depth = 1;
  let i = openBrace + 1;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') depth--;
    i++;
  }

  if (depth !== 0) {
    throw new Error('Could not find matching closing brace for "packages:" block');
  }

  return { start: openBrace + 1, end: i - 1 };
}

/**
 * インデントを検出する。packages ブロック内の既存エントリから推定する。
 */
function detectIndent(content: string, blockStart: number): string {
  const blockContent = content.slice(blockStart);
  const match = blockContent.match(/\n(\s+)\w/);
  return match ? match[1] : '    ';
}

/**
 * PackageDeployConfigをTypeScriptオブジェクトリテラル文字列に変換する。
 */
function configToString(config: PackageDeployConfig): string {
  const parts: string[] = [];
  if (config.target) {
    parts.push(`target: '${config.target}'`);
  }
  if (config.colocateWith) {
    parts.push(`colocateWith: '${config.colocateWith}'`);
  }
  if (config.url) {
    parts.push(`url: '${config.url}'`);
  }
  return `{ ${parts.join(', ')} }`;
}

/**
 * kagaribi.config.ts のパッケージセクションに新しいパッケージを追加する。
 */
export async function updateConfigAddPackage(
  projectRoot: string,
  entry: ConfigUpdateEntry
): Promise<void> {
  const configPath = resolve(projectRoot, 'kagaribi.config.ts');
  const content = await readFile(configPath, 'utf-8');

  const { packageName, config } = entry;

  // 既に存在するかチェック
  const existingPattern = new RegExp(`\\b${escapeRegExp(packageName)}\\s*:`);
  if (existingPattern.test(content)) {
    throw new Error(
      `Package "${packageName}" already exists in kagaribi.config.ts`
    );
  }

  const { end } = findPackagesBlock(content);
  const indent = detectIndent(content, content.indexOf('{', content.indexOf('packages:')));

  const configStr = configToString(config);
  const newEntry = `${indent}${packageName}: ${configStr},\n`;

  // 閉じブレースの前に挿入
  const beforeClose = content.slice(0, end);
  const afterClose = content.slice(end);

  // 末尾が改行でなければ追加
  const separator = beforeClose.endsWith('\n') ? '' : '\n';

  const updated = beforeClose + separator + newEntry + afterClose;
  await writeFile(configPath, updated, 'utf-8');
}

/**
 * kagaribi.config.ts の特定パッケージのデプロイ設定を更新する。
 * デプロイ結果（target + url）を反映する。
 */
export async function updateConfigSetDeployResult(
  projectRoot: string,
  packageName: string,
  target: DeployTarget,
  url: string
): Promise<void> {
  const configPath = resolve(projectRoot, 'kagaribi.config.ts');
  const content = await readFile(configPath, 'utf-8');

  const config: PackageDeployConfig = { target, url };
  const configStr = configToString(config);

  // 既存エントリのパターンマッチ
  // packageName: { ... }, (改行含む)
  const entryPattern = new RegExp(
    `(\\s*)${escapeRegExp(packageName)}\\s*:\\s*\\{[^}]*\\}\\s*,?`
  );

  const match = content.match(entryPattern);

  if (match) {
    // 既存エントリを置換
    const indent = match[1];
    const replacement = `${indent}${packageName}: ${configStr},`;
    const updated = content.replace(entryPattern, replacement);
    await writeFile(configPath, updated, 'utf-8');
  } else {
    // エントリが存在しない場合は追加
    await updateConfigAddPackage(projectRoot, {
      packageName,
      config,
    });
  }
}

/**
 * 正規表現用のエスケープ処理。
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
