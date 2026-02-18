import { describe, it, expect } from 'vitest';
import {
  getDbDependencies,
  generateDbSchema,
  generateDbIndex,
  generateDrizzleConfig,
  generateEnvExample,
  getDbExternals,
} from '../db.js';
import type { DbDialect } from '../types.js';

const dialects: DbDialect[] = ['postgresql', 'mysql'];

describe('getDbDependencies', () => {
  it('postgresql の依存関係が正しい', () => {
    const result = getDbDependencies('postgresql');
    expect(result.deps['drizzle-orm']).toBeDefined();
    expect(result.deps.pg).toBeDefined();
    expect(result.devDeps['drizzle-kit']).toBeDefined();
    expect(result.devDeps['@types/pg']).toBeDefined();
  });

  it('mysql の依存関係が正しい', () => {
    const result = getDbDependencies('mysql');
    expect(result.deps['drizzle-orm']).toBeDefined();
    expect(result.deps.mysql2).toBeDefined();
    expect(result.devDeps['drizzle-kit']).toBeDefined();
  });
});

describe('generateDbSchema', () => {
  it.each(dialects)('%s: posts テーブル定義を含む', (dialect) => {
    const schema = generateDbSchema(dialect);
    expect(schema).toContain('posts');
    expect(schema).toContain('id');
    expect(schema).toContain('title');
    expect(schema).toContain('content');
    expect(schema).toContain('created_at');
  });

  it('postgresql: pgTable を使用する', () => {
    const schema = generateDbSchema('postgresql');
    expect(schema).toContain('pgTable');
    expect(schema).toContain("from 'drizzle-orm/pg-core'");
  });

  it('mysql: mysqlTable を使用する', () => {
    const schema = generateDbSchema('mysql');
    expect(schema).toContain('mysqlTable');
    expect(schema).toContain("from 'drizzle-orm/mysql-core'");
  });
});

describe('generateDbIndex', () => {
  it.each(dialects)('%s: createDbHelper を使用する', (dialect) => {
    const index = generateDbIndex(dialect);
    expect(index).toContain('createDbHelper');
    expect(index).toContain('const { initDb, getDb } =');
    expect(index).toContain("from './schema.js'");
    expect(index).toContain('export { initDb, getDb, schema }');
  });

  it('postgresql: node-postgres ドライバーを使用する', () => {
    const index = generateDbIndex('postgresql');
    expect(index).toContain("from 'drizzle-orm/node-postgres'");
    expect(index).toContain("drizzle(url, { schema })");
  });

  it('mysql: mysql2 ドライバーを使用する', () => {
    const index = generateDbIndex('mysql');
    expect(index).toContain("from 'drizzle-orm/mysql2'");
    expect(index).toContain("drizzle(url, { schema })");
  });
});

describe('generateDrizzleConfig', () => {
  it.each(dialects)('%s: drizzle-kit 設定を含む', (dialect) => {
    const config = generateDrizzleConfig(dialect);
    expect(config).toContain("from 'drizzle-kit'");
    expect(config).toContain("schema: './db/schema.ts'");
    expect(config).toContain("out: './drizzle'");
    expect(config).toContain(`dialect: '${dialect}'`);
    expect(config).toContain('dbCredentials');
  });
});

describe('generateEnvExample', () => {
  it('postgresql: DATABASE_URL テンプレートを含む', () => {
    const env = generateEnvExample('postgresql');
    expect(env).toContain('DATABASE_URL=postgresql://');
  });

  it('mysql: DATABASE_URL テンプレートを含む', () => {
    const env = generateEnvExample('mysql');
    expect(env).toContain('DATABASE_URL=mysql://');
  });
});

describe('getDbExternals', () => {
  it('postgresql: pg, pg-native を返す', () => {
    const result = getDbExternals('postgresql');
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining(['pg', 'pg-native']));
  });

  it('mysql: mysql2 を返す', () => {
    const result = getDbExternals('mysql');
    expect(result).toHaveLength(1);
    expect(result).toEqual(expect.arrayContaining(['mysql2']));
  });
});
