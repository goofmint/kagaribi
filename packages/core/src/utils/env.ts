import type { MiddlewareHandler } from 'hono';

/**
 * 環境変数を取得し、存在しない場合はエラーを投げる。
 *
 * @param key - 取得する環境変数のキー
 * @param defaultValue - 環境変数が存在しない場合のデフォルト値（オプショナル）
 * @returns 環境変数の値
 * @throws {Error} 環境変数が存在せず、デフォルト値も指定されていない場合
 *
 * @example
 * ```typescript
 * // 環境変数が必須の場合
 * const jwtSecret = requireEnv('JWT_SECRET');
 *
 * // デフォルト値を指定する場合
 * const port = requireEnv('PORT', '3000');
 * ```
 */
export function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`${key} environment variable is required`);
  }
  return value;
}

/**
 * Node.js の process.env を Hono の c.env に設定するミドルウェアを生成する。
 *
 * Cloudflare Workers などの FaaS 環境では `c.env` で環境変数にアクセスするが、
 * Node.js 環境では `process.env` を使用する。このミドルウェアは、Node.js
 * 環境で動作する Hono アプリに対して、`process.env` の値を `c.env` に
 * 転送することで、環境に依存しないコードを書けるようにする。
 *
 * @param envVars - 転送する環境変数のキーと値のマップ
 * @returns Hono ミドルウェア
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { createEnvMiddleware } from '@kagaribi/core';
 *
 * const app = new Hono();
 *
 * // process.env の値を c.env に設定
 * app.use('*', createEnvMiddleware({
 *   JWT_SECRET: process.env.JWT_SECRET!,
 *   SHARED_SECRET: process.env.SHARED_SECRET!,
 * }));
 *
 * app.get('/protected', (c) => {
 *   // c.env で環境変数にアクセス可能
 *   const secret = c.env.JWT_SECRET;
 *   return c.json({ ok: true });
 * });
 * ```
 */
export function createEnvMiddleware(
  envVars: Record<string, string>
): MiddlewareHandler {
  return async (c, next) => {
    for (const [key, value] of Object.entries(envVars)) {
      // @ts-ignore - c.env の型定義を動的に変更できないため
      c.env[key] = value;
    }
    await next();
  };
}
