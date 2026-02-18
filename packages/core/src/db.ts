import type { DbDialect, SqliteDriver } from './types.js';

interface DbDependencies {
  deps: Record<string, string>;
  devDeps: Record<string, string>;
}

/**
 * dialect に応じた npm 依存関係を返す。
 */
export function getDbDependencies(dialect: DbDialect, driver?: SqliteDriver): DbDependencies {
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
    case 'sqlite': {
      const sqliteDriver = driver || 'better-sqlite3';

      switch (sqliteDriver) {
        case 'better-sqlite3':
          return {
            deps: {
              'drizzle-orm': '^0.38.0',
              'better-sqlite3': '^11.0.0',
            },
            devDeps: {
              'drizzle-kit': '^0.30.0',
              '@types/better-sqlite3': '^7.6.0',
            },
          };
        case 'libsql':
          return {
            deps: {
              'drizzle-orm': '^0.38.0',
              '@libsql/client': '^0.14.0',
            },
            devDeps: {
              'drizzle-kit': '^0.30.0',
            },
          };
        case 'd1':
          return {
            deps: {
              'drizzle-orm': '^0.38.0',
            },
            devDeps: {
              'drizzle-kit': '^0.30.0',
            },
          };
        case 'sqlite-cloud':
          return {
            deps: {
              'drizzle-orm': 'beta',
              '@sqlitecloud/drivers': '^1.0.0',
            },
            devDeps: {
              'drizzle-kit': 'beta',
            },
          };
      }
    }
  }
}

/**
 * db/schema.ts テンプレートを生成する。
 */
export function generateDbSchema(dialect: DbDialect, driver?: SqliteDriver): string {
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
    case 'sqlite':
      return `import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});
`;
  }
}

/**
 * db/index.ts テンプレートを生成する。createDbHelper を使用。
 */
export function generateDbIndex(dialect: DbDialect, driver?: SqliteDriver): string {
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
    case 'sqlite': {
      const sqliteDriver = driver || 'better-sqlite3';

      switch (sqliteDriver) {
        case 'better-sqlite3':
          return `import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createDbHelper } from '@kagaribi/core';
import * as schema from './schema.js';

const { initDb, getDb } = createDbHelper((url) => drizzle(url, { schema }));

export { initDb, getDb, schema };
`;
        case 'libsql':
          return `import { drizzle } from 'drizzle-orm/libsql';
import { createDbHelper } from '@kagaribi/core';
import * as schema from './schema.js';

const { initDb, getDb } = createDbHelper((url) =>
  drizzle({
    connection: {
      url: url,
      // Turso の場合は authToken も必要
      // authToken: process.env.DATABASE_AUTH_TOKEN
    },
    schema
  })
);

export { initDb, getDb, schema };
`;
        case 'd1':
          return `import { drizzle } from 'drizzle-orm/d1';
import { createDbHelper } from '@kagaribi/core';
import * as schema from './schema.js';

// D1 は Cloudflare Workers の env バインディングから取得
// バインディングオブジェクトを直接受け取る createDbHelper を使用
//
// 使用例:
// export interface Env {
//   DB: D1Database;
// }
//
// const app = new Hono<{ Bindings: Env }>()
//   .use('*', createDbMiddleware({
//     initFn: initDb,
//     envVarName: 'DB',
//     isBinding: true
//   }))
//
// または手動で初期化:
// initDb(env.DB);

const { initDb, getDb } = createDbHelper<ReturnType<typeof drizzle>, D1Database>(
  (d1) => drizzle(d1, { schema })
);

export { initDb, getDb, schema };
`;
        case 'sqlite-cloud':
          return `import { drizzle } from 'drizzle-orm/sqlite-cloud';
import { createDbHelper } from '@kagaribi/core';
import * as schema from './schema.js';

const { initDb, getDb } = createDbHelper((url) => drizzle(url, { schema }));

export { initDb, getDb, schema };
`;
      }
    }
  }
}

/**
 * drizzle.config.ts テンプレートを生成する。
 */
export function generateDrizzleConfig(dialect: DbDialect, driver?: SqliteDriver): string {
  if (dialect === 'sqlite' && driver === 'd1') {
    return `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  // D1 の場合、ローカル開発では wrangler を使用
  // 本番環境では drizzle-kit migrate で適用
  dbCredentials: {
    url: 'file:.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<db-id>.sqlite',
  },
});
`;
  }

  return `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: '${dialect === 'sqlite' ? 'sqlite' : dialect}',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`;
}

/**
 * .env.example テンプレートを生成する。
 */
export function generateEnvExample(dialect: DbDialect, driver?: SqliteDriver): string {
  switch (dialect) {
    case 'postgresql':
      return `# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
`;
    case 'mysql':
      return `# Database connection
DATABASE_URL=mysql://user:password@localhost:3306/mydb
`;
    case 'sqlite': {
      const sqliteDriver = driver || 'better-sqlite3';

      switch (sqliteDriver) {
        case 'better-sqlite3':
          return `# Database connection (SQLite file path)
DATABASE_URL=sqlite.db
# または file: プロトコル
# DATABASE_URL=file:./data/sqlite.db
`;
        case 'libsql':
          return `# Database connection
# ローカル SQLite ファイル
DATABASE_URL=file:local.db

# または Turso リモート接続
# DATABASE_URL=libsql://your-database.turso.io
# DATABASE_AUTH_TOKEN=your-auth-token
`;
        case 'd1':
          return `# Cloudflare D1 は wrangler.json で設定します
# .env.example は必要ありませんが、参考情報として残します

# D1 設定例 (wrangler.json に記述):
# {
#   "d1_databases": [
#     {
#       "binding": "DB",
#       "database_name": "my-database",
#       "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
#     }
#   ]
# }
`;
        case 'sqlite-cloud':
          return `# Database connection (SQLite Cloud)
DATABASE_URL=sqlitecloud://your-host.sqlite.cloud:8860/your-database?apikey=your-api-key
`;
      }
    }
  }
}

/**
 * esbuild でバンドルから除外すべきネイティブ DB ドライバーを返す。
 */
export function getDbExternals(dialect: DbDialect, driver?: SqliteDriver): string[] {
  switch (dialect) {
    case 'postgresql':
      return ['pg', 'pg-native'];
    case 'mysql':
      return ['mysql2'];
    case 'sqlite': {
      const sqliteDriver = driver || 'better-sqlite3';

      switch (sqliteDriver) {
        case 'better-sqlite3':
          return ['better-sqlite3'];
        case 'libsql':
          return ['@libsql/client'];
        case 'd1':
          return [];
        case 'sqlite-cloud':
          return ['@sqlitecloud/drivers'];
      }
    }
  }
}
