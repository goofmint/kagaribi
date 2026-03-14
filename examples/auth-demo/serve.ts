import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mountAllLocal, registerLocalClient } from '@kagaribi/core';

// パッケージをインポート
import authApp from './packages/auth/src/index.js';
import protectedApiApp from './packages/protected-api/src/index.js';
import rootApp from './packages/root/src/index.js';

// 環境変数の検証
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
if (!process.env.SHARED_SECRET) {
  throw new Error('SHARED_SECRET environment variable is required');
}

// 環境変数を Hono の env に設定するミドルウェア
// @ts-ignore - 型の不一致を回避
const envMiddleware = (app) => {
  // @ts-ignore - any 型を許可
  app.use('*', async (c, next) => {
    // Node.js 環境では process.env から環境変数を読み取り、c.env に設定
    c.env = {
      JWT_SECRET: process.env.JWT_SECRET!,
      SHARED_SECRET: process.env.SHARED_SECRET!,
    };
    await next();
  });
  return app;
};

// 環境変数ミドルウェアを各アプリに適用
envMiddleware(authApp);
envMiddleware(protectedApiApp);
envMiddleware(rootApp);

// ローカルクライアントを登録（getClient で使用するため）
// @ts-ignore - Variables 型の不一致を回避
registerLocalClient({ name: 'auth', app: authApp });
// @ts-ignore - Variables 型の不一致を回避
registerLocalClient({ name: 'protected-api', app: protectedApiApp });
// @ts-ignore - Variables 型の不一致を回避
registerLocalClient({ name: 'root', app: rootApp });

// すべてのパッケージをマウント
const app = mountAllLocal([
  // @ts-ignore - Variables 型の不一致を回避
  { name: 'root', basePath: '/', app: rootApp },
  // @ts-ignore - Variables 型の不一致を回避
  { name: 'auth', basePath: '/auth', app: authApp },
  // @ts-ignore - Variables 型の不一致を回避
  { name: 'protected-api', basePath: '/api', app: protectedApiApp },
]);

// ルートアプリにも環境変数ミドルウェアを適用
envMiddleware(app);

const port = Number.parseInt(process.env.PORT || '3000', 10);

console.log(`🚀 Auth Demo Server starting on http://localhost:${port}`);
console.log('');
console.log('Available endpoints:');
console.log(`  - http://localhost:${port}/login         - Login page`);
console.log(`  - http://localhost:${port}/dashboard     - Dashboard (auth required)`);
console.log(`  - http://localhost:${port}/auth/api/login   - Login API`);
console.log(`  - http://localhost:${port}/auth/api/verify  - Verify token API`);
console.log(`  - http://localhost:${port}/api/profile      - Profile API (auth required)`);
console.log(`  - http://localhost:${port}/api/secret       - Secret API (auth required)`);
console.log('');
console.log('Demo credentials:');
console.log('  Email: alice@example.com / Password: password123');
console.log('  Email: bob@example.com / Password: password456');
console.log('');

serve({
  fetch: app.fetch,
  port,
});
