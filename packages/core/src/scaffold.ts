import { resolve } from 'node:path';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import type { DeployTarget } from './types.js';

interface ScaffoldOptions {
  /** プロジェクトルートパス */
  projectRoot: string;
  /** パッケージ名 */
  name: string;
  /** デプロイターゲット（指定しない場合はcolocateWith: 'root'） */
  target?: DeployTarget;
}

/**
 * パッケージ名のバリデーション。
 * 英小文字、数字、ハイフンのみ許可。先頭は英小文字。
 */
function validatePackageName(name: string): void {
  if (!name) {
    throw new Error('Package name is required.');
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(
      `Invalid package name "${name}". Must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.`
    );
  }
}

/**
 * パッケージ名を PascalCase の型名に変換する。
 * 例: "my-auth" → "MyAuth"
 */
function toPascalCase(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * kagaribi.package.ts のテンプレートを生成する。
 */
function generatePackageManifest(name: string): string {
  return `import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: '${name}',
  runtime: ['node', 'cloudflare-workers', 'deno'],
});
`;
}

/**
 * src/index.ts のテンプレートを生成する。
 */
function generateIndexTs(name: string): string {
  const typeName = `${toPascalCase(name)}App`;
  return `import { Hono } from 'hono';

const app = new Hono()
  .get('/', (c) => {
    return c.json({ message: 'Hello from ${name}' });
  });

export type ${typeName} = typeof app;
export default app;
`;
}

/**
 * 新しいパッケージをスキャフォールドする。
 * packages/<name>/ ディレクトリと初期ファイルを生成する。
 */
export async function scaffoldPackage(options: ScaffoldOptions): Promise<void> {
  const { projectRoot, name } = options;

  validatePackageName(name);

  const packageDir = resolve(projectRoot, 'packages', name);
  const srcDir = resolve(packageDir, 'src');

  // 既存ディレクトリチェック
  const exists = await stat(packageDir)
    .then(() => true)
    .catch(() => false);

  if (exists) {
    throw new Error(
      `Package directory "packages/${name}" already exists.`
    );
  }

  // ディレクトリ作成
  await mkdir(srcDir, { recursive: true });

  // ファイル生成
  await Promise.all([
    writeFile(
      resolve(packageDir, 'kagaribi.package.ts'),
      generatePackageManifest(name),
      'utf-8'
    ),
    writeFile(
      resolve(srcDir, 'index.ts'),
      generateIndexTs(name),
      'utf-8'
    ),
  ]);
}
