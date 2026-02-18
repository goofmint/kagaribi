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

  describe('--db postgresql', () => {
    it('DB関連ファイルが生成される', async () => {
      const projectDir = await initProject({
        parentDir: tempDir,
        name: 'db-app',
        db: 'postgresql',
      });

      // db/ ディレクトリ
      const dbDirStat = await stat(resolve(projectDir, 'db'));
      expect(dbDirStat.isDirectory()).toBe(true);

      // db/schema.ts
      const schema = await readFile(resolve(projectDir, 'db', 'schema.ts'), 'utf-8');
      expect(schema).toContain('pgTable');
      expect(schema).toContain('posts');

      // db/index.ts
      const index = await readFile(resolve(projectDir, 'db', 'index.ts'), 'utf-8');
      expect(index).toContain('getDb');
      expect(index).toContain('node-postgres');

      // drizzle.config.ts
      const drizzleConfig = await readFile(resolve(projectDir, 'drizzle.config.ts'), 'utf-8');
      expect(drizzleConfig).toContain("dialect: 'postgresql'");

      // .env.example
      const envExample = await readFile(resolve(projectDir, '.env.example'), 'utf-8');
      expect(envExample).toContain('DATABASE_URL=postgresql://');
    });

    it('package.json に DB 依存関係が含まれる', async () => {
      const projectDir = await initProject({
        parentDir: tempDir,
        name: 'db-app2',
        db: 'postgresql',
      });

      const content = await readFile(resolve(projectDir, 'package.json'), 'utf-8');
      const pkg = JSON.parse(content);

      expect(pkg.dependencies['drizzle-orm']).toBeDefined();
      expect(pkg.dependencies.pg).toBeDefined();
      expect(pkg.devDependencies['drizzle-kit']).toBeDefined();
      expect(pkg.devDependencies['@types/pg']).toBeDefined();
      expect(pkg.scripts['db:generate']).toBe('drizzle-kit generate');
      expect(pkg.scripts['db:migrate']).toBe('drizzle-kit migrate');
      expect(pkg.scripts['db:studio']).toBe('drizzle-kit studio');
    });

    it('kagaribi.config.ts に db セクションが含まれる', async () => {
      const projectDir = await initProject({
        parentDir: tempDir,
        name: 'db-app3',
        db: 'postgresql',
      });

      const content = await readFile(resolve(projectDir, 'kagaribi.config.ts'), 'utf-8');
      expect(content).toContain("dialect: 'postgresql'");
    });

    it('tsconfig.json の include に db が含まれる', async () => {
      const projectDir = await initProject({
        parentDir: tempDir,
        name: 'db-app4',
        db: 'postgresql',
      });

      const content = await readFile(resolve(projectDir, 'tsconfig.json'), 'utf-8');
      const tsconfig = JSON.parse(content);
      expect(tsconfig.include).toContain('db');
    });

    it('.gitignore に .env と drizzle/ が含まれる', async () => {
      const projectDir = await initProject({
        parentDir: tempDir,
        name: 'db-app5',
        db: 'postgresql',
      });

      const content = await readFile(resolve(projectDir, '.gitignore'), 'utf-8');
      expect(content).toContain('.env');
      expect(content).toContain('drizzle/');
    });
  });

  describe('--db mysql', () => {
    it('MySQL 用の DB ファイルが生成される', async () => {
      const projectDir = await initProject({
        parentDir: tempDir,
        name: 'mysql-app',
        db: 'mysql',
      });

      const schema = await readFile(resolve(projectDir, 'db', 'schema.ts'), 'utf-8');
      expect(schema).toContain('mysqlTable');

      const index = await readFile(resolve(projectDir, 'db', 'index.ts'), 'utf-8');
      expect(index).toContain('mysql2');

      const pkg = JSON.parse(
        await readFile(resolve(projectDir, 'package.json'), 'utf-8')
      );
      expect(pkg.dependencies.mysql2).toBeDefined();
    });
  });

  describe('--db sqlite', () => {
    describe('better-sqlite3 (default)', () => {
      it('SQLite 用の DB ファイルが生成される（driver 未指定）', async () => {
        const projectDir = await initProject({
          parentDir: tempDir,
          name: 'sqlite-app',
          db: 'sqlite',
        });

        const schema = await readFile(resolve(projectDir, 'db', 'schema.ts'), 'utf-8');
        expect(schema).toContain('sqliteTable');
        expect(schema).toContain('drizzle-orm/sqlite-core');
        expect(schema).toContain("integer('id').primaryKey({ autoIncrement: true })");

        const index = await readFile(resolve(projectDir, 'db', 'index.ts'), 'utf-8');
        expect(index).toContain('drizzle-orm/better-sqlite3');

        const pkg = JSON.parse(
          await readFile(resolve(projectDir, 'package.json'), 'utf-8')
        );
        expect(pkg.dependencies['better-sqlite3']).toBeDefined();
        expect(pkg.devDependencies['@types/better-sqlite3']).toBeDefined();

        const envExample = await readFile(resolve(projectDir, '.env.example'), 'utf-8');
        expect(envExample).toContain('DATABASE_URL=sqlite.db');
      });

      it('driver=better-sqlite3 を明示指定', async () => {
        const projectDir = await initProject({
          parentDir: tempDir,
          name: 'sqlite-better-app',
          db: 'sqlite',
          driver: 'better-sqlite3',
        });

        const config = await readFile(resolve(projectDir, 'kagaribi.config.ts'), 'utf-8');
        expect(config).toContain("dialect: 'sqlite'");
        expect(config).toContain("driver: 'better-sqlite3'");
      });
    });

    describe('libsql', () => {
      it('libsql ドライバー用のファイルが生成される', async () => {
        const projectDir = await initProject({
          parentDir: tempDir,
          name: 'libsql-app',
          db: 'sqlite',
          driver: 'libsql',
        });

        const index = await readFile(resolve(projectDir, 'db', 'index.ts'), 'utf-8');
        expect(index).toContain('drizzle-orm/libsql');
        expect(index).toContain('authToken');

        const pkg = JSON.parse(
          await readFile(resolve(projectDir, 'package.json'), 'utf-8')
        );
        expect(pkg.dependencies['@libsql/client']).toBeDefined();

        const envExample = await readFile(resolve(projectDir, '.env.example'), 'utf-8');
        expect(envExample).toContain('DATABASE_URL=file:local.db');
        expect(envExample).toContain('DATABASE_AUTH_TOKEN');
      });
    });

    describe('d1', () => {
      it('Cloudflare D1 ドライバー用のファイルが生成される', async () => {
        const projectDir = await initProject({
          parentDir: tempDir,
          name: 'd1-app',
          db: 'sqlite',
          driver: 'd1',
        });

        const index = await readFile(resolve(projectDir, 'db', 'index.ts'), 'utf-8');
        expect(index).toContain('drizzle-orm/d1');
        expect(index).toContain('D1Database');
        expect(index).toContain('initDb');

        const pkg = JSON.parse(
          await readFile(resolve(projectDir, 'package.json'), 'utf-8')
        );
        // D1 はドライバーパッケージ不要
        expect(pkg.dependencies.pg).toBeUndefined();
        expect(pkg.dependencies.mysql2).toBeUndefined();
        expect(pkg.dependencies['better-sqlite3']).toBeUndefined();

        const envExample = await readFile(resolve(projectDir, '.env.example'), 'utf-8');
        expect(envExample).toContain('wrangler.json');
        expect(envExample).toContain('d1_databases');
      });
    });

    describe('sqlite-cloud', () => {
      it('SQLite Cloud ドライバー用のファイルが生成される', async () => {
        const projectDir = await initProject({
          parentDir: tempDir,
          name: 'sqlite-cloud-app',
          db: 'sqlite',
          driver: 'sqlite-cloud',
        });

        const index = await readFile(resolve(projectDir, 'db', 'index.ts'), 'utf-8');
        expect(index).toContain('drizzle-orm/sqlite-cloud');

        const pkg = JSON.parse(
          await readFile(resolve(projectDir, 'package.json'), 'utf-8')
        );
        expect(pkg.dependencies['drizzle-orm']).toBe('beta');
        expect(pkg.dependencies['@sqlitecloud/drivers']).toBeDefined();
        expect(pkg.devDependencies['drizzle-kit']).toBe('beta');

        const envExample = await readFile(resolve(projectDir, '.env.example'), 'utf-8');
        expect(envExample).toContain('sqlitecloud://');
      });
    });

    it('driver 指定が db=sqlite 以外の場合はエラー', async () => {
      await expect(
        initProject({
          parentDir: tempDir,
          name: 'invalid-driver-app',
          db: 'postgresql',
          driver: 'better-sqlite3',
        })
      ).rejects.toThrow('driver option can only be used with db="sqlite"');
    });
  });

  it('db未指定の場合 DB ファイルが生成されない', async () => {
    const projectDir = await initProject({
      parentDir: tempDir,
      name: 'no-db-app',
    });

    const dbDirExists = await stat(resolve(projectDir, 'db'))
      .then(() => true)
      .catch(() => false);
    expect(dbDirExists).toBe(false);

    const drizzleConfigExists = await stat(resolve(projectDir, 'drizzle.config.ts'))
      .then(() => true)
      .catch(() => false);
    expect(drizzleConfigExists).toBe(false);

    const content = await readFile(resolve(projectDir, 'kagaribi.config.ts'), 'utf-8');
    expect(content).not.toContain('db:');

    const tsconfig = JSON.parse(
      await readFile(resolve(projectDir, 'tsconfig.json'), 'utf-8')
    );
    expect(tsconfig.include).not.toContain('db');
  });
});
