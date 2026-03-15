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

import { sign } from 'hono/jwt';
import type { Context } from 'hono';
import type { KagaribiJwtPayload, AuthContext } from './types.js';
import { createContextHeaders } from './context.js';

/**
 * JWT トークンのデフォルト設定値。
 *
 * アプリケーション全体で一貫性のあるトークン設定を使用するための定数。
 * これらの値は推奨設定であり、必要に応じてオーバーライドできる。
 *
 * @example
 * ```typescript
 * import { sign, JWT_DEFAULTS } from '@kagaribi/core';
 *
 * // デフォルト設定を使用
 * const token = await sign(
 *   { sub: 'user123', exp: Math.floor(Date.now() / 1000) + JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN },
 *   secret,
 *   JWT_DEFAULTS.ALGORITHM
 * );
 *
 * // カスタム有効期限を使用
 * const longLivedToken = await sign(
 *   { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 }, // 1時間
 *   secret,
 *   JWT_DEFAULTS.ALGORITHM
 * );
 * ```
 */
export const JWT_DEFAULTS = {
  /** アクセストークンの有効期限（秒）: 15分 */
  ACCESS_TOKEN_EXPIRES_IN: 60 * 15,
  /** リフレッシュトークンの有効期限（秒）: 7日 */
  REFRESH_TOKEN_EXPIRES_IN: 60 * 60 * 24 * 7,
  /** JWT 署名アルゴリズム */
  ALGORITHM: 'HS256' as const,
} as const;

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
  payload: AuthContext,
  sharedSecret: string
): Promise<Record<string, string>> {
  return createContextHeaders(payload as Record<string, unknown>, sharedSecret);
}

/**
 * アクセストークンとリフレッシュトークンのペアを生成する。
 *
 * この関数は、ログイン時やトークンリフレッシュ時に、アクセストークンと
 * リフレッシュトークンを同時に生成するヘルパー関数です。
 *
 * @param payload - JWT ペイロードに含めるデータ（sub は必須）
 * @param secret - JWT 署名用のシークレットキー
 * @param options - トークンの有効期限のカスタム設定（オプショナル）
 * @returns アクセストークン、リフレッシュトークン、有効期限の情報
 *
 * @example
 * ```typescript
 * import { createTokenPair } from '@kagaribi/core';
 *
 * // デフォルト設定でトークンペアを生成
 * const { accessToken, refreshToken, expiresIn } = await createTokenPair(
 *   {
 *     sub: 'user123',
 *     email: 'user@example.com',
 *     user: { id: 'user123', email: 'user@example.com', name: 'John' },
 *   },
 *   'your-secret-key'
 * );
 *
 * // カスタム有効期限でトークンペアを生成
 * const tokens = await createTokenPair(
 *   { sub: 'user123' },
 *   'your-secret-key',
 *   {
 *     accessExpiresIn: 3600,        // 1時間
 *     refreshExpiresIn: 2592000,    // 30日
 *   }
 * );
 * ```
 */
export async function createTokenPair(
  payload: KagaribiJwtPayload & { sub: string },
  secret: string,
  options?: {
    accessExpiresIn?: number;
    refreshExpiresIn?: number;
  }
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  // Runtime validation for sub
  if (!payload?.sub || typeof payload.sub !== 'string') {
    throw new Error('payload.sub is required and must be a string');
  }

  const now = Math.floor(Date.now() / 1000);
  const accessExpiresIn = options?.accessExpiresIn ?? JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN;
  const refreshExpiresIn = options?.refreshExpiresIn ?? JWT_DEFAULTS.REFRESH_TOKEN_EXPIRES_IN;

  const accessToken = await sign(
    { ...payload, iat: now, exp: now + accessExpiresIn },
    secret,
    JWT_DEFAULTS.ALGORITHM
  );

  const refreshToken = await sign(
    { sub: payload.sub, type: 'refresh', iat: now, exp: now + refreshExpiresIn },
    secret,
    JWT_DEFAULTS.ALGORITHM
  );

  return { accessToken, refreshToken, expiresIn: accessExpiresIn };
}
