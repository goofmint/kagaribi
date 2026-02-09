import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { scaffoldPackage } from '../scaffold.js';

describe('scaffoldPackage', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(resolve(tmpdir(), 'kagaribi-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('ディレクトリとファイルを正しく生成する', async () => {
    await scaffoldPackage({ projectRoot: tempDir, name: 'payments' });

    const packageDir = resolve(tempDir, 'packages', 'payments');
    const srcDir = resolve(packageDir, 'src');

    // ディレクトリ存在チェック
    const dirStat = await stat(srcDir);
    expect(dirStat.isDirectory()).toBe(true);

    // kagaribi.package.ts の内容チェック
    const manifest = await readFile(
      resolve(packageDir, 'kagaribi.package.ts'),
      'utf-8'
    );
    expect(manifest).toContain("name: 'payments'");
    expect(manifest).toContain('definePackage');
    expect(manifest).toContain("'node', 'cloudflare-workers', 'deno'");

    // src/index.ts の内容チェック
    const indexTs = await readFile(resolve(srcDir, 'index.ts'), 'utf-8');
    expect(indexTs).toContain("import { Hono } from 'hono'");
    expect(indexTs).toContain("'Hello from payments'");
    expect(indexTs).toContain('export type PaymentsApp');
    expect(indexTs).toContain('export default app');
  });

  it('ハイフン付きの名前をPascalCaseの型名に変換する', async () => {
    await scaffoldPackage({ projectRoot: tempDir, name: 'my-auth' });

    const indexTs = await readFile(
      resolve(tempDir, 'packages', 'my-auth', 'src', 'index.ts'),
      'utf-8'
    );
    expect(indexTs).toContain('export type MyAuthApp');
  });

  it('既存ディレクトリがある場合エラーを投げる', async () => {
    // 先に一度作成
    await scaffoldPackage({ projectRoot: tempDir, name: 'existing' });

    // 2回目は失敗
    await expect(
      scaffoldPackage({ projectRoot: tempDir, name: 'existing' })
    ).rejects.toThrow('already exists');
  });

  it('無効な名前でエラーを投げる', async () => {
    await expect(
      scaffoldPackage({ projectRoot: tempDir, name: '' })
    ).rejects.toThrow('required');

    await expect(
      scaffoldPackage({ projectRoot: tempDir, name: 'My-Auth' })
    ).rejects.toThrow('Invalid package name');

    await expect(
      scaffoldPackage({ projectRoot: tempDir, name: '123abc' })
    ).rejects.toThrow('Invalid package name');
  });
});
