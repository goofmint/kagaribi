import { Hono } from 'hono';
import type { ResolvedPackage, RegisteredPackage } from './types.js';
import { resolveEnvVar } from './scanner.js';
import { proxyMiddleware } from './proxy.js';

/**
 * 解決済みパッケージ情報から、統合されたHonoアプリを構築する。
 *
 * - ローカルパッケージ: app.route() でマウント
 * - リモートパッケージ: proxyMiddleware でプロキシ
 *
 * @param rootApp ルートパッケージのHonoアプリ
 * @param packages 各パッケージのHonoアプリのマップ
 * @param resolved 解決済みパッケージ情報
 */
export function mountPackages(
  rootApp: Hono,
  packages: Map<string, Hono>,
  resolved: ResolvedPackage[]
): Hono {
  const app = new Hono();

  for (const pkg of resolved) {
    if (pkg.name === 'root') {
      // rootパッケージは / にマウント
      const rootHono = packages.get('root');
      if (rootHono) {
        app.route('/', rootHono);
      }
      continue;
    }

    const basePath = `/${pkg.name}`;

    if (pkg.mode === 'local') {
      // ローカル: Honoアプリを直接マウント
      const pkgApp = packages.get(pkg.name);
      if (pkgApp) {
        app.route(basePath, pkgApp);
      }
    } else {
      // リモート: プロキシミドルウェア
      const targetUrl = pkg.deploy.url
        ? resolveEnvVar(pkg.deploy.url)
        : undefined;

      if (!targetUrl) {
        throw new Error(
          `Remote package "${pkg.name}" requires a url in deploy config`
        );
      }

      app.all(`${basePath}/*`, proxyMiddleware({ target: targetUrl }));
    }
  }

  return app;
}

/**
 * 開発モード用: 全パッケージをローカルマウントする簡易関数。
 */
export function mountAllLocal(
  packages: RegisteredPackage[]
): Hono {
  const app = new Hono();

  for (const pkg of packages) {
    app.route(pkg.basePath, pkg.app);
  }

  return app;
}
