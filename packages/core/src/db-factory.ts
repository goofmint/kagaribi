import { createRequire } from 'node:module';
import { createDbHelper } from './db-helper.js';
import type { DbDialect, SqliteDriver } from './types.js';

const require = createRequire(import.meta.url);

/**
 * Global database instance for shared access across model helpers and packages.
 */
let globalDbInstance: { initDb: (source: any) => void; getDb: () => any } | null = null;

/**
 * Create database instance with automatic dialect detection.
 *
 * Eliminates the need for db/index.ts by automatically importing
 * the correct Drizzle ORM driver based on the dialect.
 *
 * @param dialect - Database dialect ('postgresql', 'mysql', 'sqlite')
 * @param schema - Database schema object (imported from schema.ts)
 * @param options - Optional configuration (SQLite driver, etc.)
 *
 * @example
 * ```typescript
 * import { createDb } from '@kagaribi/core';
 * import * as schema from '../../../db/schema.js';
 *
 * const { initDb, getDb } = createDb('postgresql', schema);
 * ```
 *
 * @example
 * ```typescript
 * // With SQLite and specific driver
 * import { createDb } from '@kagaribi/core';
 * import * as schema from '../../../db/schema.js';
 *
 * const { initDb, getDb } = createDb('sqlite', schema, { driver: 'd1' });
 * ```
 */
export function createDb<TDbInstance = any, TSource = string>(
  dialect: DbDialect,
  schema: Record<string, any>,
  options?: {
    driver?: SqliteDriver;
  }
): { initDb: (source: TSource) => void; getDb: () => TDbInstance } {
  // If global instance doesn't exist, create it
  if (!globalDbInstance) {
    let helper: { initDb: (source: TSource) => void; getDb: () => TDbInstance };

    switch (dialect) {
      case 'postgresql': {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { drizzle } = require('drizzle-orm/node-postgres');
        helper = createDbHelper<TDbInstance, TSource>((url: TSource) =>
          drizzle(url, { schema })
        );
        break;
      }

      case 'mysql': {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { drizzle } = require('drizzle-orm/mysql2');
        helper = createDbHelper<TDbInstance, TSource>((url: TSource) =>
          drizzle(url, { schema })
        );
        break;
      }

      case 'sqlite': {
        const driver = options?.driver || 'libsql';

        switch (driver) {
          case 'libsql': {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { drizzle } = require('drizzle-orm/libsql');
            helper = createDbHelper<TDbInstance, TSource>((url: TSource) =>
              drizzle({ connection: { url: url as string }, schema })
            );
            break;
          }

          case 'd1': {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { drizzle } = require('drizzle-orm/d1');
            helper = createDbHelper<TDbInstance, TSource>((d1: TSource) =>
              drizzle(d1, { schema })
            );
            break;
          }

          case 'sqlite-cloud': {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { drizzle } = require('drizzle-orm/sqlite-cloud');
            helper = createDbHelper<TDbInstance, TSource>((url: TSource) =>
              drizzle(url, { schema })
            );
            break;
          }

          default:
            throw new Error(`Unsupported SQLite driver: ${driver}`);
        }
        break;
      }

      default:
        throw new Error(`Unsupported database dialect: ${dialect}`);
    }

    // Set global instance
    globalDbInstance = helper;
    return helper;
  }

  return globalDbInstance as { initDb: (source: TSource) => void; getDb: () => TDbInstance };
}

/**
 * Initialize global database instance.
 *
 * This function sets up a global database instance that can be accessed
 * from anywhere in the application, including model helpers.
 *
 * @param dialect - Database dialect ('postgresql', 'mysql', 'sqlite')
 * @param schema - Database schema object (imported from schema.ts)
 * @param options - Optional configuration (SQLite driver, etc.)
 *
 * @example
 * ```typescript
 * import { initGlobalDb, createDbMiddleware } from '@kagaribi/core';
 * import * as schema from '../../../db/schema.js';
 *
 * const { initDb } = initGlobalDb('postgresql', schema);
 *
 * const app = new Hono()
 *   .use('*', createDbMiddleware({ initFn: initDb }));
 * ```
 */
export function initGlobalDb<TDbInstance = any, TSource = string>(
  dialect: DbDialect,
  schema: Record<string, any>,
  options?: {
    driver?: SqliteDriver;
  }
): { initDb: (source: TSource) => void; getDb: () => TDbInstance } {
  if (!globalDbInstance) {
    globalDbInstance = createDb<TDbInstance, TSource>(dialect, schema, options);
  }
  return globalDbInstance as { initDb: (source: TSource) => void; getDb: () => TDbInstance };
}

/**
 * Get the global database instance.
 *
 * This function retrieves the global database instance that was initialized
 * with initGlobalDb(). Used by model helpers to access the database.
 *
 * @throws Error if global database is not initialized
 *
 * @example
 * ```typescript
 * // In model helper files
 * import { getGlobalDb } from '@kagaribi/core';
 *
 * export async function findAll() {
 *   const { getDb } = getGlobalDb();
 *   const db = getDb();
 *   return await db.select().from(posts);
 * }
 * ```
 */
export function getGlobalDb<TDbInstance = any, TSource = string>(): {
  initDb: (source: TSource) => void;
  getDb: () => TDbInstance;
} {
  if (!globalDbInstance) {
    throw new Error(
      'Global database not initialized. Call initGlobalDb() in your package before using model helpers.'
    );
  }
  return globalDbInstance as { initDb: (source: TSource) => void; getDb: () => TDbInstance };
}
