import { createRequire } from 'node:module';
import { createDbHelper } from './db-helper.js';
import type { DbDialect, SqliteDriver } from './types.js';

const require = createRequire(import.meta.url);

/**
 * Global database instance for shared access across model helpers and packages.
 * Stores both the helper and its configuration for validation.
 */
let globalDbInstance: {
  helper: { initDb: (source: unknown) => void; getDb: () => unknown };
  config: { dialect: DbDialect; schema: Record<string, unknown>; driver?: SqliteDriver };
} | null = null;

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
export function createDb<TDbInstance = unknown, TSource = string>(
  dialect: DbDialect,
  schema: Record<string, unknown>,
  options?: {
    driver?: SqliteDriver;
  }
): { initDb: (source: TSource) => void; getDb: () => TDbInstance } {
  // If global instance exists, validate configuration
  if (globalDbInstance) {
    const { config } = globalDbInstance;

    // Validate dialect match
    if (config.dialect !== dialect) {
      throw new Error(
        `Database configuration mismatch: global instance uses dialect "${config.dialect}" but createDb was called with "${dialect}". ` +
        `Each application should only call createDb once with consistent configuration.`
      );
    }

    // Validate schema match (reference equality check)
    if (config.schema !== schema) {
      throw new Error(
        `Database configuration mismatch: global instance uses a different schema object. ` +
        `Ensure you're importing the same schema instance across your application.`
      );
    }

    // Validate SQLite driver match (if applicable)
    if (dialect === 'sqlite') {
      const requestedDriver = options?.driver || 'libsql';
      const configDriver = config.driver || 'libsql';
      if (requestedDriver !== configDriver) {
        throw new Error(
          `Database configuration mismatch: global instance uses SQLite driver "${configDriver}" but createDb was called with "${requestedDriver}". ` +
          `Use consistent driver configuration across your application.`
        );
      }
    }

    // Configuration matches, return existing instance
    return globalDbInstance.helper as { initDb: (source: TSource) => void; getDb: () => TDbInstance };
  }

  // Global instance doesn't exist, create it
  {
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

    // Set global instance with configuration
    globalDbInstance = {
      helper,
      config: {
        dialect,
        schema,
        driver: options?.driver,
      },
    };
    return helper;
  }
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
