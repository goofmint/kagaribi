import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import type { DeployTarget, PackageDeployConfig } from './types.js';

interface ConfigUpdateEntry {
  packageName: string;
  config: PackageDeployConfig;
}

/**
 * 文字列リテラルやコメント内のブレースをスキップしながら
 * packages: { ... } ブロック内の開始・終了位置を特定する。
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
    const ch = content[i];

    // 単一行コメント
    if (ch === '/' && content[i + 1] === '/') {
      const eol = content.indexOf('\n', i);
      i = eol === -1 ? content.length : eol + 1;
      continue;
    }

    // ブロックコメント
    if (ch === '/' && content[i + 1] === '*') {
      const end = content.indexOf('*/', i + 2);
      i = end === -1 ? content.length : end + 2;
      continue;
    }

    // 文字列リテラル（シングルクォート、ダブルクォート）
    if (ch === "'" || ch === '"') {
      i++;
      while (i < content.length && content[i] !== ch) {
        if (content[i] === '\\') i++; // エスケープをスキップ
        i++;
      }
      i++; // 閉じクォートをスキップ
      continue;
    }

    // テンプレートリテラル（バッククォート）
    if (ch === '`') {
      i++;
      while (i < content.length && content[i] !== '`') {
        if (content[i] === '\\') i++; // エスケープをスキップ
        i++;
      }
      i++; // 閉じバッククォートをスキップ
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') depth--;
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
 * パッケージ名をTSオブジェクトキーとしてフォーマットする。
 * 識別子として有効でない名前（ハイフン含む等）はクォートで囲む。
 */
function formatObjectKey(name: string): string {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    return name;
  }
  return `'${name}'`;
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

  // packages ブロック内のみで既存チェック
  const { start, end } = findPackagesBlock(content);
  const packagesBlock = content.slice(start, end);

  const escapedKey = escapeRegExp(packageName);
  // クォート有無両方にマッチ
  const existingPattern = new RegExp(`(?:['"]${escapedKey}['"]|\\b${escapedKey})\\s*:`);
  if (existingPattern.test(packagesBlock)) {
    throw new Error(
      `Package "${packageName}" already exists in kagaribi.config.ts`
    );
  }

  const indent = detectIndent(content, start);

  const key = formatObjectKey(packageName);
  const configStr = configToString(config);
  const newEntry = `${indent}${key}: ${configStr},\n`;

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
  const key = formatObjectKey(packageName);

  // packages ブロック内のみで操作
  const { start, end } = findPackagesBlock(content);
  const packagesBlock = content.slice(start, end);

  // 既存エントリのパターンマッチ（クォート有無両方に対応）
  const escapedKey = escapeRegExp(packageName);
  const entryPattern = new RegExp(
    `(\\s*)(?:['"]${escapedKey}['"]|${escapedKey})\\s*:\\s*\\{[^}]*\\}\\s*,?`
  );

  const match = packagesBlock.match(entryPattern);

  if (match) {
    // packages ブロック内で置換
    const indent = match[1];
    const replacement = `${indent}${key}: ${configStr},`;
    const updatedBlock = packagesBlock.replace(entryPattern, replacement);
    const updated = content.slice(0, start) + updatedBlock + content.slice(end);
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
