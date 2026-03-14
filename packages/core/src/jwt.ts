/**
 * JWT 認証統合モジュール
 *
 * Hono の組み込み JWT 機能を再エクスポートし、Kagaribi のコンテキスト伝播との統合を提供します。
 *
 * ## 基本的な使用方法
 *
 * ### JWT トークンの発行
 * ```typescript
 * import { sign } from '@kagaribi/core';
 *
 * const token = await sign(
 *   { sub: 'user123', role: 'admin' },
 *   'mySecretKey'
 * );
 * ```
 *
 * ### JWT ミドルウェアによるルート保護
 * ```typescript
 * import { definePackage } from '@kagaribi/core';
 * import { jwt } from '@kagaribi/core';
 *
 * export default definePackage({
 *   name: 'api',
 *   factory: () => {
 *     const app = new Hono();
 *
 *     // JWT 認証を要求するルート
 *     app.use('/protected/*', jwt({ secret: 'mySecretKey' }));
 *
 *     app.get('/protected/data', (c) => {
 *       const payload = c.get('jwtPayload');
 *       return c.json({ user: payload.sub });
 *     });
 *
 *     return app;
 *   }
 * });
 * ```
 *
 * ## Kagaribi コンテキスト伝播との統合
 *
 * FaaS 分離デプロイ時に、認証情報をパッケージ間で伝播させるパターン:
 *
 * ```typescript
 * import { definePackage, jwt, getAuthPayloadFromContext, createAuthContextHeaders } from '@kagaribi/core';
 *
 * export default definePackage({
 *   name: 'gateway',
 *   factory: () => {
 *     const app = new Hono();
 *
 *     // 1. JWT 検証ミドルウェアを適用
 *     app.use('/api/*', jwt({ secret: 'mySecretKey' }));
 *
 *     // 2. 認証情報を Kagaribi コンテキストに格納
 *     app.use('/api/*', async (c, next) => {
 *       const payload = getAuthPayloadFromContext(c);
 *       if (payload) {
 *         c.set('user', payload.user);
 *       }
 *       await next();
 *     });
 *
 *     return app;
 *   }
 * });
 * ```
 *
 * プロキシ側でコンテキストヘッダーを生成:
 * ```typescript
 * import { createAuthContextHeaders } from '@kagaribi/core';
 *
 * const payload = getAuthPayloadFromContext(c);
 * const headers = await createAuthContextHeaders(
 *   { user: payload?.user },
 *   'sharedSecret'
 * );
 * // headers を fetch リクエストに追加
 * ```
 */

// Hono JWT ミドルウェアとヘルパー関数の再エクスポート
export { jwt, sign, verify, decode } from 'hono/jwt';

import type { Context } from 'hono';
import type { KagaribiJwtPayload } from './types.js';
import { createContextHeaders } from './context.js';

/**
 * Hono コンテキストから JWT ペイロードを型安全に取得するヘルパー関数。
 *
 * @param c - Hono コンテキスト
 * @returns JWT ペイロード（存在しない場合は undefined）
 *
 * @example
 * ```typescript
 * app.get('/profile', (c) => {
 *   const payload = getAuthPayloadFromContext(c);
 *   if (!payload) {
 *     return c.json({ error: 'Unauthorized' }, 401);
 *   }
 *   return c.json({ user: payload.user });
 * });
 * ```
 */
export function getAuthPayloadFromContext<T extends KagaribiJwtPayload = KagaribiJwtPayload>(
  c: Context
): T | undefined {
  return c.get('jwtPayload') as T | undefined;
}

/**
 * 検証済み JWT ペイロードを Kagaribi コンテキストヘッダー形式に変換するヘルパー関数。
 *
 * この関数は、リモートパッケージへのプロキシリクエスト時に、
 * 認証情報を `X-Kagaribi-Context` ヘッダーとして伝播させる際に使用します。
 *
 * @param payload - JWT ペイロードから抽出した認証情報
 * @param sharedSecret - コンテキスト署名用の共有シークレット
 * @returns X-Kagaribi-Context および X-Kagaribi-Signature ヘッダー
 *
 * @example
 * ```typescript
 * const payload = getAuthPayloadFromContext(c);
 * const headers = await createAuthContextHeaders(
 *   { user: payload?.user },
 *   process.env.SHARED_SECRET!
 * );
 *
 * const response = await fetch('https://remote-package.example.com/api', {
 *   headers: {
 *     ...headers,
 *     'Content-Type': 'application/json',
 *   }
 * });
 * ```
 */
export async function createAuthContextHeaders(
  payload: Record<string, unknown>,
  sharedSecret: string
): Promise<Record<string, string>> {
  return createContextHeaders(payload, sharedSecret);
}
