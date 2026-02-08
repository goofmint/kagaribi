import { Hono } from 'hono';
import { html, raw } from 'hono/html';
import { getClient } from '@kagaribi/core';
import type { UsersApp } from '../../users/src/index.js';

const app = new Hono()
  .get('/', (c) => {
    return c.html(html`
      <!DOCTYPE html>
      <html>
        <head><title>kagaribi example</title></head>
        <body>
          <h1>kagaribi - Basic Example</h1>
          <nav>
            <ul>
              <li><a href="/auth/login">Auth - Login</a></li>
              <li><a href="/users/api/users">Users - API</a></li>
              <li><a href="/users/view/list">Users - View</a></li>
              <li><a href="/users/1/articles">Articles - User 1</a></li>
              <li><a href="/users/2/articles">Articles - User 2</a></li>
              <li><a href="/dashboard">Dashboard (cross-package call demo)</a></li>
            </ul>
          </nav>
        </body>
      </html>
    `);
  })
  .get('/health', (c) => {
    return c.json({ status: 'healthy', package: 'root' });
  })
  /**
   * ダッシュボード: rootパッケージがusersパッケージをgetClientで呼び出し、
   * 取得したWebComponent HTMLをレイアウトにマージして返す。
   * これがkagaribiの核心機能 — パッケージ間呼び出しのデモ。
   */
  .get('/dashboard', async (c) => {
    // usersパッケージのクライアントを取得
    // ローカル/リモートを意識せず同一インタフェースで呼べる
    const users = getClient<UsersApp>('users');

    // usersパッケージのUI断片を取得
    const userListRes = await users.view.list.$get();
    const userListHtml = await userListRes.text();

    return c.html(html`
      <!DOCTYPE html>
      <html>
        <head><title>Dashboard - kagaribi</title></head>
        <body>
          <header>
            <h1>Dashboard</h1>
            <p>This page is rendered by the <strong>root</strong> package,
            embedding UI from the <strong>users</strong> package via getClient().</p>
            <p><a href="/">Back to home</a></p>
          </header>
          <main>
            <section>
              <h2>User List (from users package)</h2>
              ${raw(userListHtml)}
            </section>
          </main>
        </body>
      </html>
    `);
  });

export type RootApp = typeof app;
export default app;
