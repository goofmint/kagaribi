import { Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';
import { getClient } from '@kagaribi/core';
import type { UsersApp } from '../../users/src/index.js';
import { RootLayout } from './views/Layout.js';
import { HomePage } from './views/HomePage.js';
import { DashboardPage } from './views/DashboardPage.js';

const app = new Hono();

/**
 * jsxRenderer ミドルウェアを使用して共有レイアウトを設定
 * すべてのビューで自動的に RootLayout が適用される
 */
app.use(
  '*',
  jsxRenderer(({ children }) => {
    return <RootLayout>{children}</RootLayout>;
  })
);

app
  // ホームページ
  // c.render() を使用すると、jsxRenderer で設定したレイアウトが自動適用される
  .get('/', (c) => {
    return c.render(<HomePage />);
  })

  // ヘルスチェックAPI
  .get('/health', (c) => {
    return c.json({ status: 'healthy', package: 'root' });
  })

  /**
   * Dashboard: Cross-package integration demo
   *
   * Route handler responsibilities:
   * 1. Get client from other packages
   * 2. Fetch data (API calls)
   * 3. Pass props to view component
   * 4. Render
   *
   * Presentation logic is delegated to DashboardPage component
   */
  .get('/dashboard', async (c) => {
    // 1. Get users package client
    const users = getClient<UsersApp>('users');

    // 2. Fetch UI component from users package
    // @ts-expect-error - Workaround for getClient type inference issue
    const userListRes = await users.view.list.$get();
    const userListHtml = await userListRes.text();

    // 3. Pass props to view component and render
    // RootLayout is automatically applied via c.render()
    return c.render(<DashboardPage userListHtml={userListHtml} />);
  });

export type RootApp = typeof app;
export default app;
