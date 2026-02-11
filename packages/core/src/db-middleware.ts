import type { MiddlewareHandler } from 'hono';

export interface DbMiddlewareOptions {
  /**
   * データベース初期化関数。
   * 環境変数から取得したDATABASE_URLを受け取る。
   */
  initFn: (databaseUrl: string) => void;
  /**
   * 環境変数名（デフォルト: 'DATABASE_URL'）
   */
  envVarName?: string;
}

/**
 * データベース初期化ミドルウェアを作成する。
 * Node.js環境とCloudflare Workers環境の両方に対応。
 *
 * @example
 * ```typescript
 * import { createDbMiddleware } from '@kagaribi/core';
 * import { initDb } from './db/index';
 *
 * const app = new Hono()
 *   .use('*', createDbMiddleware({ initFn: initDb }))
 * ```
 */
export function createDbMiddleware(
  options: DbMiddlewareOptions
): MiddlewareHandler {
  const { initFn, envVarName = 'DATABASE_URL' } = options;

  return async (c, next) => {
    let databaseUrl: string | undefined;

    // Node.js環境
    if (typeof process !== 'undefined' && process.env?.[envVarName]) {
      databaseUrl = process.env[envVarName];
    }
    // Cloudflare Workers環境
    else if (
      'env' in c &&
      c.env &&
      typeof c.env === 'object' &&
      envVarName in c.env
    ) {
      databaseUrl = (c.env as Record<string, string>)[envVarName];
    }

    if (databaseUrl) {
      initFn(databaseUrl);
    }

    await next();
  };
}
