/**
 * データベース接続ヘルパーを作成する。
 * シングルトンパターンでデータベース接続を管理し、重複初期化を防ぐ。
 *
 * @param createConnection - データベース接続を作成する関数
 * @returns initDb, getDb 関数を含むオブジェクト
 *
 * @example
 * ```typescript
 * // db/index.ts
 * import { drizzle } from 'drizzle-orm/node-postgres';
 * import { createDbHelper } from '@kagaribi/core';
 * import * as schema from './schema';
 *
 * const { initDb, getDb } = createDbHelper((url) => drizzle(url, { schema }));
 *
 * export { initDb, getDb, schema };
 * ```
 *
 * @example
 * ```typescript
 * // Neon Serverless (Cloudflare Workers向け)
 * import { drizzle } from 'drizzle-orm/neon-http';
 * import { neon } from '@neondatabase/serverless';
 * import { createDbHelper } from '@kagaribi/core';
 * import * as schema from './schema';
 *
 * const { initDb, getDb } = createDbHelper((url) => {
 *   const sql = neon(url);
 *   return drizzle(sql, { schema });
 * });
 *
 * export { initDb, getDb, schema };
 * ```
 */
export function createDbHelper<TDb>(
  createConnection: (databaseUrl: string) => TDb
) {
  let _db: TDb | undefined;

  /**
   * データベース接続を初期化する。
   * 既に初期化済みの場合は何もしない（冪等性）。
   */
  function initDb(databaseUrl: string): void {
    if (_db) return;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required.');
    }
    _db = createConnection(databaseUrl);
  }

  /**
   * 初期化済みのデータベース接続を取得する。
   * 初期化されていない場合はエラーをスローする。
   */
  function getDb(): TDb {
    if (!_db) {
      throw new Error('Database not initialized. Call initDb() first.');
    }
    return _db;
  }

  return { initDb, getDb };
}
