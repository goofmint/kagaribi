import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { registerLocalClient, kagaribiParamsMiddleware } from '@kagaribi/core';
import type { PackageDefinition } from '@kagaribi/core';

interface DevServerOptions {
  port?: number;
  packagesDir?: string;
}

interface LoadedPackage {
  name: string;
  app: Hono;
  routes?: string[];
}

/**
 * kagaribi dev - 開発サーバーを起動する。
 *
 * packages/ 配下の全パッケージを検出し、
 * 全てをローカルモードでルートアプリにマウントして起動する。
 * 同時に各パッケージをクライアントレジストリに登録し、
 * getClient() でパッケージ間呼び出しが可能な状態にする。
 */
/**
 * .env ファイルを読み込んで process.env に設定する。
 * 既に設定されている環境変数は上書きしない。
 */
async function loadEnvFile(cwd: string): Promise<void> {
  try {
    const content = await readFile(join(cwd, '.env'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();

      // Remove surrounding quotes if they match
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Unescape common escape sequences
      value = value
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env がなければスキップ
  }
}

export async function devServer(options: DevServerOptions = {}): Promise<void> {
  const port = options.port ?? 3000;
  const cwd = process.cwd();

  // .env ファイルを読み込み（DB接続文字列等）
  await loadEnvFile(cwd);

  const packagesDir = options.packagesDir ?? join(cwd, 'packages');

  console.log('[kagaribi] Scanning packages...');

  // パッケージディレクトリを走査
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const loadedPackages: LoadedPackage[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgDir = resolve(packagesDir, entry.name);
    const srcIndex = join(pkgDir, 'src', 'index.ts');

    const exists = await stat(srcIndex)
      .then((s) => s.isFile())
      .catch(() => false);

    if (!exists) continue;

    // 動的インポートでパッケージのHonoアプリを読み込む
    const mod = await import(srcIndex);
    const pkgApp = mod.default ?? mod.app;

    if (!pkgApp) {
      console.warn(
        `[kagaribi] Warning: ${entry.name}/src/index.ts does not export a Hono app`
      );
      continue;
    }

    // kagaribi.package.ts があれば routes を読み取る
    let routes: string[] | undefined;
    const manifestPath = join(pkgDir, 'kagaribi.package.ts');
    const manifestExists = await stat(manifestPath)
      .then((s) => s.isFile())
      .catch(() => false);

    if (manifestExists) {
      const manifestMod = await import(manifestPath);
      const definition = manifestMod.default as PackageDefinition | undefined;
      routes = definition?.routes;
    }

    loadedPackages.push({ name: entry.name, app: pkgApp, routes });

    // 開発時は全パッケージをローカルクライアントとして登録
    // これによりgetClient()でパッケージ間呼び出しが可能になる
    registerLocalClient({ name: entry.name, app: pkgApp });
  }

  if (loadedPackages.length === 0) {
    console.error('[kagaribi] No packages found in', packagesDir);
    process.exit(1);
  }

  // マウント順序: ネストルートを先に、通常ルートを後に
  // （Honoは先着マッチなので、具体的なパスを先に登録する必要がある）
  const nestedPackages = loadedPackages.filter((p) => p.routes && p.routes.length > 0);
  const normalPackages = loadedPackages.filter((p) => !p.routes || p.routes.length === 0);

  const app = new Hono();
  const mountedRoutes: string[] = [];

  // 1. ネストルートを先にマウント
  for (const pkg of nestedPackages) {
    for (const routePattern of pkg.routes!) {
      // パスパラメータを含むルートパターンの場合、
      // ミドルウェアでパラメータを抽出して c.set() に設定する
      const hasPathParams = routePattern.includes(':');

      if (hasPathParams) {
        // パスパラメータ付きルート
        // 例: '/users/:userId/articles' → app.all('/users/:userId/articles/*', ...)
        // Honoのルーティングが :userId を c.req.param('userId') で取得可能にする
        // kagaribiParamsMiddleware で X-Kagaribi-Params ヘッダーからも取得可能にする
        const wrappedApp = new Hono();
        wrappedApp.use('*', kagaribiParamsMiddleware());
        wrappedApp.route('/', pkg.app);

        // ワイルドカードとexactの両方を登録
        app.all(`${routePattern}/*`, async (c) => {
          // Honoのパスパラメータを X-Kagaribi-Params ヘッダーとしてセット
          const params: Record<string, string> = {};
          const paramMatches = routePattern.match(/:([^/]+)/g);
          if (paramMatches) {
            for (const match of paramMatches) {
              const paramName = match.slice(1);
              const value = c.req.param(paramName);
              if (value) {
                params[paramName] = value;
              }
            }
          }

          // パスからプレフィクスを除去してパッケージのルートに変換
          const url = new URL(c.req.url);
          const prefix = routePattern.replace(/:([^/]+)/g, c.req.param.bind(c.req) as (name: string) => string);
          const remainingPath = url.pathname.slice(prefix.length) || '/';

          // パッケージアプリに直接リクエストを転送
          const newHeaders = new Headers(c.req.raw.headers);
          if (Object.keys(params).length > 0) {
            newHeaders.set('x-kagaribi-params', JSON.stringify(params));
          }

          const newReq = new Request(
            new URL(remainingPath + url.search, 'http://localhost').toString(),
            {
              method: c.req.method,
              headers: newHeaders,
              body: c.req.method !== 'GET' && c.req.method !== 'HEAD'
                ? await c.req.raw.clone().arrayBuffer()
                : undefined,
            }
          );

          return pkg.app.request(newReq);
        });

        app.all(routePattern, async (c) => {
          const params: Record<string, string> = {};
          const paramMatches = routePattern.match(/:([^/]+)/g);
          if (paramMatches) {
            for (const match of paramMatches) {
              const paramName = match.slice(1);
              const value = c.req.param(paramName);
              if (value) {
                params[paramName] = value;
              }
            }
          }

          const url = new URL(c.req.url);
          const newHeaders = new Headers(c.req.raw.headers);
          if (Object.keys(params).length > 0) {
            newHeaders.set('x-kagaribi-params', JSON.stringify(params));
          }

          const newReq = new Request(
            new URL('/' + url.search, 'http://localhost').toString(),
            {
              method: c.req.method,
              headers: newHeaders,
              body: c.req.method !== 'GET' && c.req.method !== 'HEAD'
                ? await c.req.raw.clone().arrayBuffer()
                : undefined,
            }
          );

          return pkg.app.request(newReq);
        });

        mountedRoutes.push(`${pkg.name} -> ${routePattern}[/*]`);
      } else {
        // 静的ルート（パスパラメータなし）
        app.route(routePattern, pkg.app);
        mountedRoutes.push(`${pkg.name} -> ${routePattern}`);
      }
    }
  }

  // 2. 通常ルートをマウント
  for (const pkg of normalPackages) {
    const basePath = pkg.name === 'root' ? '/' : `/${pkg.name}`;
    app.route(basePath, pkg.app);
    mountedRoutes.push(`${pkg.name} -> ${basePath}`);
  }

  console.log('[kagaribi] Loaded packages:');
  for (const route of mountedRoutes) {
    console.log(`  - ${route}`);
  }
  console.log('[kagaribi] All packages registered as local clients');

  // 開発サーバー起動
  console.log(`[kagaribi] Starting dev server on http://localhost:${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}
