import type { DbDialect } from './types.js';

interface DbDependencies {
  deps: Record<string, string>;
  devDeps: Record<string, string>;
}

/**
 * dialect に応じた npm 依存関係を返す。
 */
export function getDbDependencies(dialect: DbDialect): DbDependencies {
  switch (dialect) {
    case 'postgresql':
      return {
        deps: {
          'drizzle-orm': '^0.38.0',
          pg: '^8.13.0',
        },
        devDeps: {
          'drizzle-kit': '^0.30.0',
          '@types/pg': '^8.11.0',
        },
      };
    case 'mysql':
      return {
        deps: {
          'drizzle-orm': '^0.38.0',
          mysql2: '^3.11.0',
        },
        devDeps: {
          'drizzle-kit': '^0.30.0',
        },
      };
  }
}

/**
 * db/schema.ts テンプレートを生成する。
 */
export function generateDbSchema(dialect: DbDialect): string {
  switch (dialect) {
    case 'postgresql':
      return `import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
`;
    case 'mysql':
      return `import { mysqlTable, serial, text, varchar, timestamp } from 'drizzle-orm/mysql-core';

export const posts = mysqlTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
`;
  }
}

/**
 * db/index.ts テンプレートを生成する。createDbHelper を使用。
 */
export function generateDbIndex(dialect: DbDialect): string {
  switch (dialect) {
    case 'postgresql':
      return `import { drizzle } from 'drizzle-orm/node-postgres';
import { createDbHelper } from '@kagaribi/core';
import * as schema from './schema.js';

const { initDb, getDb } = createDbHelper((url) => drizzle(url, { schema }));

export { initDb, getDb, schema };
`;
    case 'mysql':
      return `import { drizzle } from 'drizzle-orm/mysql2';
import { createDbHelper } from '@kagaribi/core';
import * as schema from './schema.js';

const { initDb, getDb } = createDbHelper((url) => drizzle(url, { schema }));

export { initDb, getDb, schema };
`;
  }
}

/**
 * drizzle.config.ts テンプレートを生成する。
 */
export function generateDrizzleConfig(dialect: DbDialect): string {
  return `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: '${dialect}',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`;
}

/**
 * .env.example テンプレートを生成する。
 */
export function generateEnvExample(dialect: DbDialect): string {
  switch (dialect) {
    case 'postgresql':
      return `# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
`;
    case 'mysql':
      return `# Database connection
DATABASE_URL=mysql://user:password@localhost:3306/mydb
`;
  }
}

/**
 * esbuild でバンドルから除外すべきネイティブ DB ドライバーを返す。
 */
export function getDbExternals(dialect: DbDialect): string[] {
  switch (dialect) {
    case 'postgresql':
      return ['pg', 'pg-native'];
    case 'mysql':
      return ['mysql2'];
  }
}
