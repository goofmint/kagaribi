import type { MiddlewareHandler } from 'hono';

export interface DbMiddlewareOptions<TSource = string> {
  /**
   * データベース初期化関数。
   * 環境変数から取得した値を受け取る。
   * isBinding が true の場合はバインディングオブジェクト（TSource）、false の場合は文字列。
   */
  initFn: (source: TSource) => void;
  /**
   * 環境変数名（デフォルト: 'DATABASE_URL'）
   */
  envVarName?: string;
  /**
   * バインディングオブジェクトとして扱うかどうか。
   * true の場合、c.env[envVarName] をオブジェクトとして直接 initFn に渡す。
   * false または未指定の場合、文字列として扱う（デフォルト: false）
   */
  isBinding?: boolean;
}

/**
 * データベース初期化ミドルウェアを作成する。
 * Node.js環境とCloudflare Workers環境の両方に対応。
 *
 * @template TSource - データベースソースの型（デフォルト: string）
 *
 * @example
 * ```typescript
 * // URL ベースの接続（PostgreSQL, MySQL, SQLite）
 * import { createDbMiddleware } from '@kagaribi/core';
 * import { initDb } from './db/index';
 *
 * const app = new Hono()
 *   .use('*', createDbMiddleware({ initFn: initDb }))
 * ```
 *
 * @example
 * ```typescript
 * // バインディングベースの接続（Cloudflare D1）
 * import { createDbMiddleware } from '@kagaribi/core';
 * import { initDb } from './db/index';
 *
 * const app = new Hono<{ Bindings: { DB: D1Database } }>()
 *   .use('*', createDbMiddleware<D1Database>({
 *     initFn: initDb,
 *     envVarName: 'DB',
 *     isBinding: true
 *   }))
 * ```
 */
export function createDbMiddleware<TSource = string>(
  options: DbMiddlewareOptions<TSource>
): MiddlewareHandler {
  const { initFn, envVarName = 'DATABASE_URL', isBinding = false } = options;

  return async (c, next) => {
    let source: TSource | undefined;

    if (isBinding) {
      // バインディングモード: オブジェクトとして直接取得
      if (
        'env' in c &&
        c.env &&
        typeof c.env === 'object' &&
        envVarName in c.env
      ) {
        const envValue = (c.env as Record<string, TSource>)[envVarName];
        if (envValue !== undefined) {
          source = envValue;
        }
      }
    } else {
      // 文字列モード（従来の動作）
      let stringSource: string | undefined;

      // Node.js環境
      if (typeof process !== 'undefined' && process.env?.[envVarName]) {
        stringSource = process.env[envVarName];
      }
      // Cloudflare Workers環境
      else if (
        'env' in c &&
        c.env &&
        typeof c.env === 'object' &&
        envVarName in c.env
      ) {
        stringSource = (c.env as Record<string, string>)[envVarName];
      }

      if (stringSource !== undefined) {
        source = stringSource as TSource;
      }
    }

    if (source !== undefined) {
      initFn(source);
    }

    await next();
  };
}
