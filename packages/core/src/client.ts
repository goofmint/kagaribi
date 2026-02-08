import { hc } from 'hono/client';
import type { Hono } from 'hono';

/**
 * パッケージクライアントのレジストリ。
 * ビルド時に生成されたコードによって register*Client で登録される。
 * any型はhcの返り値型がジェネリクス依存のため避けられない。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientRegistry = new Map<string, any>();

interface LocalClientOptions {
  /** パッケージ名 */
  name: string;
  /** パッケージのHonoアプリインスタンス */
  app: Hono;
}

interface RemoteClientOptions {
  /** パッケージ名 */
  name: string;
  /** リモートパッケージのURL */
  url: string;
  /** リモート呼び出し時に付与するヘッダー */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
}

/**
 * ローカルパッケージのクライアントを登録する。
 * hcのカスタムfetchにapp.requestを渡すことで、ネットワークを介さずに呼び出す。
 * Hono公式のtestClient()と同一のパターン。
 */
export function registerLocalClient(
  options: LocalClientOptions
): void {
  const client = hc('http://localhost', {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      return options.app.request(input, init);
    },
  });
  clientRegistry.set(options.name, client);
}

/**
 * リモートパッケージのクライアントを登録する。
 * 通常のhcによるHTTP呼び出し。
 */
export function registerRemoteClient(
  options: RemoteClientOptions
): void {
  const client = hc(options.url, {
    headers: options.headers,
  });
  clientRegistry.set(options.name, client);
}

/**
 * 登録済みパッケージのクライアントを取得する。
 * ローカル/リモートを問わず同一のインタフェースで呼び出せる。
 *
 * @example
 * ```typescript
 * import type { AuthApp } from '../auth/src/index';
 * const auth = getClient<AuthApp>('auth');
 * const res = await auth.api.verify.$get();
 * ```
 */
export function getClient<T extends Hono>(name: string): ReturnType<typeof hc<T>> {
  const client = clientRegistry.get(name);
  if (!client) {
    throw new Error(
      `[kagaribi] Package "${name}" is not registered. ` +
      `Ensure it is listed in kagaribi.config.ts and the generated client code is loaded.`
    );
  }
  return client as ReturnType<typeof hc<T>>;
}

/**
 * レジストリの全クライアントをクリアする（テスト用）。
 */
export function clearClientRegistry(): void {
  clientRegistry.clear();
}
