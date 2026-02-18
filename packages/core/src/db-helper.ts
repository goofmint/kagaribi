/**
 * データベース接続ヘルパーを作成する。
 * シングルトンパターンでデータベース接続を管理し、重複初期化を防ぐ。
 *
 * @template TDb - データベース接続オブジェクトの型
 * @template TSource - データベースソースの型（デフォルト: string）
 * @param createConnection - データベース接続を作成する関数
 * @returns initDb, getDb 関数を含むオブジェクト
 *
 * @example
 * ```typescript
 * // URL ベースの接続（PostgreSQL, MySQL, SQLite）
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
 * // バインディングベースの接続（Cloudflare D1）
 * import { drizzle } from 'drizzle-orm/d1';
 * import { createDbHelper } from '@kagaribi/core';
 * import * as schema from './schema';
 *
 * const { initDb, getDb } = createDbHelper<ReturnType<typeof drizzle>, D1Database>(
 *   (d1) => drizzle(d1, { schema })
 * );
 *
 * export { initDb, getDb, schema };
 * ```
 */
export function createDbHelper<TDb, TSource = string>(
  createConnection: (source: TSource) => TDb
) {
  let _db: TDb | undefined;

  /**
   * データベース接続を初期化する。
   * 既に初期化済みの場合は何もしない（冪等性）。
   *
   * @param source - データベースソース（URL 文字列またはバインディングオブジェクト）
   */
  function initDb(source: TSource): void {
    if (_db) return;
    if (!source) {
      throw new Error('Database source is required.');
    }
    _db = createConnection(source);
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
