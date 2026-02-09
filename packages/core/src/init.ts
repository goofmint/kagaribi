import { resolve } from 'node:path';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { scaffoldPackage } from './scaffold.js';
import type { DeployTarget } from './types.js';

interface InitOptions {
  /** プロジェクトを作成する親ディレクトリ */
  parentDir: string;
  /** プロジェクト名 */
  name: string;
  /** rootパッケージのデプロイターゲット（デフォルト: 'node'） */
  target?: DeployTarget;
}

/**
 * プロジェクト名のバリデーション。
 * npmパッケージ名と同じルール: 英小文字、数字、ハイフンのみ。先頭は英小文字。
 */
function validateProjectName(name: string): void {
  if (!name) {
    throw new Error('Project name is required.');
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(
      `Invalid project name "${name}". Must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.`
    );
  }
}

/**
 * package.json テンプレートを生成する。
 */
function generatePackageJson(name: string): string {
  const pkg = {
    name,
    private: true,
    type: 'module',
    scripts: {
      dev: 'kagaribi dev',
    },
    dependencies: {
      '@kagaribi/core': '^0.1.0',
      '@kagaribi/cli': '^0.1.0',
      '@hono/node-server': '^1.0.0',
      hono: '^4.0.0',
    },
    engines: {
      node: '>=22.6.0',
    },
    devDependencies: {
      typescript: '^5.5.0',
    },
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

/**
 * kagaribi.config.ts テンプレートを生成する。
 */
function generateConfig(target: DeployTarget): string {
  return `import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    root: {
      target: '${target}',
    },
  },
  environments: {
    development: {
      packages: {
        '*': { colocateWith: 'root' },
      },
    },
  },
});
`;
}

/**
 * tsconfig.json テンプレートを生成する。
 */
function generateTsConfig(): string {
  const config = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      esModuleInterop: true,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
    },
    include: ['packages'],
  };
  return JSON.stringify(config, null, 2) + '\n';
}

/**
 * .gitignore テンプレートを生成する。
 */
function generateGitignore(): string {
  return `node_modules/
dist/
.kagaribi/
`;
}

/**
 * rootパッケージ用の最小限 src/index.ts テンプレート。
 * scaffoldPackage が生成するデフォルトテンプレートを上書きする。
 */
function generateRootIndexTs(projectName: string): string {
  return `import { Hono } from 'hono';

const app = new Hono()
  .get('/', (c) => {
    return c.json({ name: '${projectName}', status: 'running' });
  })
  .get('/health', (c) => {
    return c.json({ status: 'healthy' });
  });

export type RootApp = typeof app;
export default app;
`;
}

/**
 * 新しいkagaribiプロジェクトを初期化する。
 * プロジェクトディレクトリとrootパッケージを含む最小限の構造を生成する。
 *
 * @returns 作成されたプロジェクトディレクトリの絶対パス
 */
export async function initProject(options: InitOptions): Promise<string> {
  const { parentDir, name, target = 'node' } = options;

  validateProjectName(name);

  const projectDir = resolve(parentDir, name);

  // 既存ディレクトリチェック
  const exists = await stat(projectDir)
    .then(() => true)
    .catch(() => false);

  if (exists) {
    throw new Error(
      `Directory "${name}" already exists.`
    );
  }

  // プロジェクトディレクトリ作成
  await mkdir(projectDir, { recursive: true });

  // ルートレベルのファイルを並列生成
  await Promise.all([
    writeFile(resolve(projectDir, 'package.json'), generatePackageJson(name), 'utf-8'),
    writeFile(resolve(projectDir, 'kagaribi.config.ts'), generateConfig(target), 'utf-8'),
    writeFile(resolve(projectDir, 'tsconfig.json'), generateTsConfig(), 'utf-8'),
    writeFile(resolve(projectDir, '.gitignore'), generateGitignore(), 'utf-8'),
  ]);

  // rootパッケージをスキャフォールド（既存関数を再利用）
  await scaffoldPackage({ projectRoot: projectDir, name: 'root' });

  // rootパッケージの src/index.ts を最小限テンプレートに上書き
  await writeFile(
    resolve(projectDir, 'packages', 'root', 'src', 'index.ts'),
    generateRootIndexTs(name),
    'utf-8'
  );

  return projectDir;
}
