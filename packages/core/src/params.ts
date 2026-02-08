import type { MiddlewareHandler } from 'hono';

/**
 * X-Kagaribi-Params ヘッダーからパスパラメータを抽出し、
 * Honoコンテキストに設定するミドルウェア。
 *
 * proxyMiddleware の pathParams オプションと対で使用する。
 * プロキシ経由で転送されたパスパラメータ（例: userId）を
 * c.get('userId') でアクセス可能にする。
 *
 * @example
 * ```typescript
 * const app = new Hono();
 * app.use('*', kagaribiParamsMiddleware());
 * app.get('/', (c) => {
 *   const userId = c.get('userId'); // プロキシ経由で渡されたパラメータ
 * });
 * ```
 */
export function kagaribiParamsMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const raw = c.req.header('x-kagaribi-params');
    if (raw) {
      const params: Record<string, string> = JSON.parse(raw);
      for (const [key, value] of Object.entries(params)) {
        c.set(key as never, value as never);
      }
    }
    await next();
  };
}
