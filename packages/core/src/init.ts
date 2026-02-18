import { resolve, basename } from 'node:path';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { scaffoldPackage } from './scaffold.js';
import type { DbDialect, DeployTarget, SqliteDriver } from './types.js';
import {
  getDbDependencies,
  generateDbSchema,
  generateDbIndex,
  generateDrizzleConfig,
  generateEnvExample,
} from './db.js';

interface InitOptions {
  /** プロジェクトを作成する親ディレクトリ */
  parentDir: string;
  /** プロジェクト名（"." の場合は親ディレクトリ名を使用） */
  name: string;
  /** rootパッケージのデプロイターゲット（デフォルト: 'node'） */
  target?: DeployTarget;
  /** データベース方言（指定しない場合はDB無し） */
  db?: DbDialect;
  /** SQLite ドライバー（db='sqlite' の場合のみ使用） */
  driver?: SqliteDriver;
}

/**
 * プロジェクト名のバリデーション。
 * npmパッケージ名と同じルール: 英小文字、数字、ハイフンのみ。先頭は英小文字。
 * "." は特別扱い（現在のディレクトリを意味する）。
 */
function validateProjectName(name: string): void {
  if (!name) {
    throw new Error('Project name is required.');
  }
  // "." は特別扱い
  if (name === '.') {
    return;
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
function generatePackageJson(name: string, db?: DbDialect, driver?: SqliteDriver): string {
  const baseDeps: Record<string, string> = {
    '@kagaribi/core': '^0.1.0',
    '@kagaribi/cli': '^0.1.0',
    '@hono/node-server': '^1.0.0',
    hono: '^4.0.0',
  };
  const baseDevDeps: Record<string, string> = {
    typescript: '^5.5.0',
  };

  if (db) {
    const dbDeps = getDbDependencies(db, driver);
    Object.assign(baseDeps, dbDeps.deps);
    Object.assign(baseDevDeps, dbDeps.devDeps);
  }

  const scripts: Record<string, string> = {
    dev: 'kagaribi dev',
  };

  if (db) {
    scripts['build:db'] = 'tsc db/index.ts db/schema.ts --outDir db --module ES2022 --target ES2022 --moduleResolution bundler --skipLibCheck';
    scripts.dev = 'pnpm run build:db && kagaribi dev';
    scripts['db:generate'] = 'drizzle-kit generate';
    scripts['db:migrate'] = 'drizzle-kit migrate';
    scripts['db:studio'] = 'drizzle-kit studio';
  }

  const pkg = {
    name,
    private: true,
    type: 'module',
    scripts,
    dependencies: baseDeps,
    engines: {
      node: '>=22.6.0',
    },
    devDependencies: baseDevDeps,
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

/**
 * kagaribi.config.ts テンプレートを生成する。
 */
function generateConfig(target: DeployTarget, db?: DbDialect, driver?: SqliteDriver): string {
  let dbSection = '';
  if (db) {
    if (driver) {
      dbSection = `\n  db: {\n    dialect: '${db}',\n    driver: '${driver}',\n  },`;
    } else {
      dbSection = `\n  db: {\n    dialect: '${db}',\n  },`;
    }
  }

  return `import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    root: {
      target: '${target}',
    },
  },${dbSection}
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
function generateTsConfig(db?: DbDialect): string {
  const include = db ? ['packages', 'db'] : ['packages'];
  const config = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      esModuleInterop: true,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: 'react-jsx',
      jsxImportSource: 'hono/jsx',
    },
    include,
  };
  return JSON.stringify(config, null, 2) + '\n';
}

/**
 * .gitignore テンプレートを生成する。
 */
function generateGitignore(db?: DbDialect): string {
  const base = `node_modules/
dist/
.kagaribi/
`;
  if (db) {
    return base + `.env
drizzle/
db/*.js
`;
  }
  return base;
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
  let { parentDir, name, target = 'node', db, driver } = options;

  validateProjectName(name);

  // SQLite 以外で driver が指定された場合はエラー
  if (driver && db !== 'sqlite') {
    throw new Error('driver option can only be used with db="sqlite"');
  }

  // "." の場合、parentDirをプロジェクトディレクトリとし、nameはディレクトリ名から取得
  const isCurrentDir = name === '.';
  const projectDir = isCurrentDir ? resolve(parentDir) : resolve(parentDir, name);

  if (isCurrentDir) {
    // ディレクトリ名からプロジェクト名を取得
    const dirName = basename(projectDir);
    // ディレクトリ名を検証
    if (!/^[a-z][a-z0-9-]*$/.test(dirName)) {
      throw new Error(
        `Current directory name "${dirName}" is not valid for a project name. Must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.`
      );
    }
    name = dirName;

    // 既存プロジェクトファイルのチェック
    const keyFiles = ['package.json', 'kagaribi.config.ts', '.git'];
    for (const file of keyFiles) {
      const exists = await stat(resolve(projectDir, file))
        .then(() => true)
        .catch(() => false);
      if (exists) {
        throw new Error(
          `Cannot initialize project in current directory: "${file}" already exists. Current directory appears to contain an existing project.`
        );
      }
    }
  } else {
    // 既存ディレクトリチェック（新規作成の場合のみ）
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
  }

  // ルートレベルのファイルを並列生成
  const rootFiles: Promise<void>[] = [
    writeFile(resolve(projectDir, 'package.json'), generatePackageJson(name, db, driver), 'utf-8'),
    writeFile(resolve(projectDir, 'kagaribi.config.ts'), generateConfig(target, db, driver), 'utf-8'),
    writeFile(resolve(projectDir, 'tsconfig.json'), generateTsConfig(db), 'utf-8'),
    writeFile(resolve(projectDir, '.gitignore'), generateGitignore(db), 'utf-8'),
  ];

  if (db) {
    rootFiles.push(
      writeFile(resolve(projectDir, 'drizzle.config.ts'), generateDrizzleConfig(db, driver), 'utf-8'),
      writeFile(resolve(projectDir, '.env.example'), generateEnvExample(db, driver), 'utf-8'),
    );
  }

  await Promise.all(rootFiles);

  // DB ディレクトリとファイルを生成
  if (db) {
    const dbDir = resolve(projectDir, 'db');
    await mkdir(dbDir, { recursive: true });
    await Promise.all([
      writeFile(resolve(dbDir, 'schema.ts'), generateDbSchema(db, driver), 'utf-8'),
      writeFile(resolve(dbDir, 'index.ts'), generateDbIndex(db, driver), 'utf-8'),
    ]);
  }

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
