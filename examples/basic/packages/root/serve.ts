import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { registerRemoteClient, proxyMiddleware } from '@kagaribi/core';
import rootApp from './src/index.js';

const usersUrl = process.env.USERS_URL ?? 'http://localhost:3002';
const authUrl = process.env.AUTH_URL ?? 'http://localhost:3003';
const articlesUrl = process.env.ARTICLES_URL ?? 'http://localhost:3004';

// getClient が実際のHTTP呼び出しになる
registerRemoteClient({ name: 'users', url: usersUrl });
registerRemoteClient({ name: 'auth', url: authUrl });
registerRemoteClient({ name: 'articles', url: articlesUrl });

const app = new Hono();
app.route('/', rootApp);

// ネストルーティング: /users/:userId/articles/* → articles パッケージ
// 重要: より具体的なパスを先に定義する（Honoは先着マッチ）
app.all(
  '/users/:userId/articles/*',
  proxyMiddleware({ target: articlesUrl, basePath: '/users/:userId/articles' }),
);
app.all(
  '/users/:userId/articles',
  proxyMiddleware({ target: articlesUrl, basePath: '/users/:userId/articles' }),
);

// プロキシ: basePath でプレフィクスを除去してリモートに転送
app.all('/users/*', proxyMiddleware({ target: usersUrl, basePath: '/users' }));
app.all('/auth/*', proxyMiddleware({ target: authUrl, basePath: '/auth' }));

const port = Number(process.env.PORT ?? 3000);
console.log(`[root] http://localhost:${port}`);
console.log(`  /users/:userId/articles/* -> ${articlesUrl}`);
console.log(`  /users/* -> ${usersUrl}`);
console.log(`  /auth/*  -> ${authUrl}`);
serve({ fetch: app.fetch, port });
