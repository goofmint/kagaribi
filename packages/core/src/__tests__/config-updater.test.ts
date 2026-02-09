import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { updateConfigAddPackage, updateConfigSetDeployResult } from '../config-updater.js';

const SAMPLE_CONFIG = `import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    root: {
      target: 'node',
    },
    auth: {
      colocateWith: 'root',
    },
  },
  environments: {
    production: {
      packages: {
        auth: { target: 'aws-lambda', url: '$AUTH_URL' },
      },
    },
  },
});
`;

describe('updateConfigAddPackage', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(resolve(tmpdir(), 'kagaribi-config-test-'));
    await writeFile(resolve(tempDir, 'kagaribi.config.ts'), SAMPLE_CONFIG, 'utf-8');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('colocateWith付きで新パッケージを追加できる', async () => {
    await updateConfigAddPackage(tempDir, {
      packageName: 'users',
      config: { colocateWith: 'root' },
    });

    const content = await readFile(resolve(tempDir, 'kagaribi.config.ts'), 'utf-8');
    expect(content).toContain("users: { colocateWith: 'root' },");
    // 既存エントリが維持されている
    expect(content).toContain("root:");
    expect(content).toContain("auth:");
  });

  it('target付きで新パッケージを追加できる', async () => {
    await updateConfigAddPackage(tempDir, {
      packageName: 'api',
      config: { target: 'cloudflare-workers' },
    });

    const content = await readFile(resolve(tempDir, 'kagaribi.config.ts'), 'utf-8');
    expect(content).toContain("api: { target: 'cloudflare-workers' },");
  });

  it('重複パッケージ名でエラーを投げる', async () => {
    await expect(
      updateConfigAddPackage(tempDir, {
        packageName: 'auth',
        config: { colocateWith: 'root' },
      })
    ).rejects.toThrow('already exists');
  });
});

describe('updateConfigSetDeployResult', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(resolve(tmpdir(), 'kagaribi-config-test-'));
    await writeFile(resolve(tempDir, 'kagaribi.config.ts'), SAMPLE_CONFIG, 'utf-8');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('既存パッケージのデプロイ設定を更新できる', async () => {
    await updateConfigSetDeployResult(
      tempDir,
      'auth',
      'aws-lambda',
      'https://auth.lambda.aws'
    );

    const content = await readFile(resolve(tempDir, 'kagaribi.config.ts'), 'utf-8');
    expect(content).toContain("auth: { target: 'aws-lambda', url: 'https://auth.lambda.aws' },");
  });

  it('存在しないパッケージは新規追加される', async () => {
    await updateConfigSetDeployResult(
      tempDir,
      'payments',
      'google-cloud-run',
      'https://payments.run.app'
    );

    const content = await readFile(resolve(tempDir, 'kagaribi.config.ts'), 'utf-8');
    expect(content).toContain("payments: { target: 'google-cloud-run', url: 'https://payments.run.app' },");
  });

  it('既存の他のエントリを保持する', async () => {
    await updateConfigSetDeployResult(
      tempDir,
      'auth',
      'cloudflare-workers',
      'https://auth.workers.dev'
    );

    const content = await readFile(resolve(tempDir, 'kagaribi.config.ts'), 'utf-8');
    // rootエントリが維持されている
    expect(content).toContain("root:");
    expect(content).toContain("target: 'node'");
    // environmentsセクションも維持
    expect(content).toContain("environments:");
    expect(content).toContain("production:");
  });
});
