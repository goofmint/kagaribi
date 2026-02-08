import type { MiddlewareHandler } from 'hono';
import { createContextHeaders } from './context.js';

interface ProxyOptions {
  /** プロキシ先のベースURL */
  target: string;
  /** リクエストパスから除去するプレフィクス（例: '/users', '/users/:userId/articles'） */
  basePath?: string;
  /** basePath 内のパスパラメータ名（例: ['userId']）。抽出した値を X-Kagaribi-Params ヘッダーで転送する */
  pathParams?: string[];
  /** ヘッダーの転送設定 */
  forwardHeaders?: string[];
  /** 署名付きコンテキスト伝播に使用する共有シークレット */
  sharedSecret?: string;
  /** コンテキストとして転送するHonoコンテキストのキー一覧 */
  contextKeys?: string[];
}

const DEFAULT_FORWARD_HEADERS = [
  'authorization',
  'content-type',
  'accept',
  'x-kagaribi-context',
  'x-kagaribi-signature',
  'x-kagaribi-request-id',
  'x-kagaribi-params',
];

/**
 * basePath パターン（例: '/users/:userId/articles'）から正規表現を生成する。
 * ':paramName' を名前付きキャプチャグループに変換し、
 * パスのプレフィクス部分をマッチさせる。
 *
 * @returns 正規表現と、パラメータ名の順序配列
 */
function buildBasePathPattern(
  basePath: string
): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regexStr = basePath.replace(/:([^/]+)/g, (_match, paramName: string) => {
    paramNames.push(paramName);
    return '([^/]+)';
  });
  return {
    regex: new RegExp(`^${regexStr}`),
    paramNames,
  };
}

/**
 * リモートパッケージへのリクエストをプロキシするミドルウェア。
 * Proxyパターンを実現する。
 *
 * sharedSecretが指定されている場合、Honoコンテキストの値を
 * 署名付きヘッダーとしてリモートパッケージに転送する。
 */
export function proxyMiddleware(options: ProxyOptions): MiddlewareHandler {
  return async (c) => {
    const url = new URL(c.req.url);
    let pathname = url.pathname;
    let extractedParams: Record<string, string> | undefined;

    // basePath が指定されている場合、パスからプレフィクスを除去
    if (options.basePath) {
      const hasPathParams = options.basePath.includes(':');

      if (hasPathParams) {
        // パスパラメータを含む basePath（例: '/users/:userId/articles'）
        // 正規表現でマッチさせてパラメータ値を抽出し、プレフィクスを除去
        const { regex, paramNames } = buildBasePathPattern(options.basePath);
        const match = pathname.match(regex);
        if (match) {
          extractedParams = {};
          for (let i = 0; i < paramNames.length; i++) {
            extractedParams[paramNames[i]] = match[i + 1];
          }
          pathname = pathname.slice(match[0].length) || '/';
        }
      } else {
        // 静的 basePath（例: '/users'）— 従来の処理
        const prefix = options.basePath.endsWith('/')
          ? options.basePath.slice(0, -1)
          : options.basePath;
        if (pathname.startsWith(prefix)) {
          pathname = pathname.slice(prefix.length) || '/';
        }
      }
    }

    const targetUrl = new URL(pathname, options.target);
    targetUrl.search = url.search;

    const headers = new Headers();

    // リクエストヘッダーを転送
    const forwardList = options.forwardHeaders ?? DEFAULT_FORWARD_HEADERS;
    for (const headerName of forwardList) {
      const value = c.req.header(headerName);
      if (value) {
        headers.set(headerName, value);
      }
    }

    // パスパラメータをヘッダーで転送
    if (extractedParams && Object.keys(extractedParams).length > 0) {
      headers.set('x-kagaribi-params', JSON.stringify(extractedParams));
    }

    // 署名付きコンテキスト伝播
    if (options.sharedSecret && options.contextKeys) {
      const contextData: Record<string, unknown> = {};
      for (const key of options.contextKeys) {
        const value = c.get(key as never);
        if (value !== undefined) {
          contextData[key] = value;
        }
      }

      if (Object.keys(contextData).length > 0) {
        const contextHeaders = await createContextHeaders(
          contextData,
          options.sharedSecret
        );
        for (const [name, value] of Object.entries(contextHeaders)) {
          headers.set(name, value);
        }
      }
    }

    const init: RequestInit = {
      method: c.req.method,
      headers,
    };

    // GETやHEAD以外はbodyを転送
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      init.body = await c.req.raw.clone().arrayBuffer();
    }

    const response = await fetch(targetUrl.toString(), init);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}
