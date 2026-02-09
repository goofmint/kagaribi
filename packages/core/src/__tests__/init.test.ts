import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { mkdtemp, rm, readFile, stat, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { initProject } from '../init.js';

describe('initProject', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(resolve(tmpdir(), 'kagaribi-init-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('プロジェクトディレクトリとファイルを正しく生成する', async () => {
    const projectDir = await initProject({
      parentDir: tempDir,
      name: 'my-app',
    });

    // 返り値がプロジェクトディレクトリのパス
    expect(projectDir).toBe(resolve(tempDir, 'my-app'));

    // ディレクトリ存在チェック
    const dirStat = await stat(projectDir);
    expect(dirStat.isDirectory()).toBe(true);

    // packages/root/src ディレクトリが存在
    const rootSrcStat = await stat(resolve(projectDir, 'packages', 'root', 'src'));
    expect(rootSrcStat.isDirectory()).toBe(true);
  });

  it('package.json の内容が正しい', async () => {
    const projectDir = await initProject({
      parentDir: tempDir,
      name: 'my-app',
    });

    const content = await readFile(resolve(projectDir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);

    expect(pkg.name).toBe('my-app');
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe('module');
    expect(pkg.scripts.dev).toBe('kagaribi dev');
    expect(pkg.dependencies['@kagaribi/core']).toBeDefined();
    expect(pkg.dependencies['@kagaribi/cli']).toBeDefined();
    expect(pkg.dependencies.hono).toBeDefined();
    expect(pkg.dependencies['@hono/node-server']).toBeDefined();
    // tsx は @kagaribi/cli の dependencies に含まれるため不要
    expect(pkg.devDependencies.tsx).toBeUndefined();
    expect(pkg.devDependencies.typescript).toBeDefined();
  });

  it('kagaribi.config.ts の内容が正しい（デフォルトtarget: node）', async () => {
    const projectDir = await initProject({
      parentDir: tempDir,
      name: 'my-app',
    });

    const content = await readFile(resolve(projectDir, 'kagaribi.config.ts'), 'utf-8');
    expect(content).toContain("import { defineConfig } from '@kagaribi/core'");
    expect(content).toContain("target: 'node'");
    expect(content).toContain("'*': { colocateWith: 'root' }");
    expect(content).toContain('environments:');
    expect(content).toContain('development:');
  });

  it('target指定時にconfigのtargetが反映される', async () => {
    const projectDir = await initProject({
      parentDir: tempDir,
      name: 'my-app',
      target: 'cloudflare-workers',
    });

    const content = await readFile(resolve(projectDir, 'kagaribi.config.ts'), 'utf-8');
    expect(content).toContain("target: 'cloudflare-workers'");
  });

  it('tsconfig.json の内容が正しい', async () => {
    const projectDir = await initProject({
      parentDir: tempDir,
      name: 'my-app',
    });

    const content = await readFile(resolve(projectDir, 'tsconfig.json'), 'utf-8');
    const tsconfig = JSON.parse(content);

    expect(tsconfig.compilerOptions.target).toBe('ES2022');
    expect(tsconfig.compilerOptions.module).toBe('ES2022');
    expect(tsconfig.compilerOptions.moduleResolution).toBe('bundler');
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.noEmit).toBe(true);
    expect(tsconfig.include).toContain('packages');
  });

  it('.gitignore の内容が正しい', async () => {
    const projectDir = await initProject({
      parentDir: tempDir,
      name: 'my-app',
    });

    const content = await readFile(resolve(projectDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('dist/');
    expect(content).toContain('.kagaribi/');
  });

  it('rootパッケージの kagaribi.package.ts が正しい', async () => {
    const projectDir = await initProject({
      parentDir: tempDir,
      name: 'my-app',
    });

    const content = await readFile(
      resolve(projectDir, 'packages', 'root', 'kagaribi.package.ts'),
      'utf-8'
    );
    expect(content).toContain("name: 'root'");
    expect(content).toContain('definePackage');
  });

  it('rootパッケージの src/index.ts が最小限テンプレート', async () => {
    const projectDir = await initProject({
      parentDir: tempDir,
      name: 'my-app',
    });

    const content = await readFile(
      resolve(projectDir, 'packages', 'root', 'src', 'index.ts'),
      'utf-8'
    );
    expect(content).toContain("import { Hono } from 'hono'");
    expect(content).toContain("name: 'my-app'");
    expect(content).toContain("status: 'running'");
    expect(content).toContain('/health');
    expect(content).toContain('export type RootApp');
    expect(content).toContain('export default app');
  });

  it('既存ディレクトリでエラーを投げる', async () => {
    await mkdir(resolve(tempDir, 'existing'), { recursive: true });

    await expect(
      initProject({ parentDir: tempDir, name: 'existing' })
    ).rejects.toThrow('already exists');
  });

  it('無効な名前でエラーを投げる', async () => {
    await expect(
      initProject({ parentDir: tempDir, name: '' })
    ).rejects.toThrow('required');

    await expect(
      initProject({ parentDir: tempDir, name: 'My-App' })
    ).rejects.toThrow('Invalid project name');

    await expect(
      initProject({ parentDir: tempDir, name: '123app' })
    ).rejects.toThrow('Invalid project name');
  });
});
