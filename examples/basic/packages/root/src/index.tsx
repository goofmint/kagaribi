import { Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';
import { getClient } from '@kagaribi/core';
import type { UsersApp } from '../../users/src/index.js';
import { RootLayout } from './views/Layout.js';
import { HomePage } from './views/HomePage.js';
import { DashboardPage } from './views/DashboardPage.js';

const app = new Hono();

/**
 * Use jsxRenderer middleware to set up shared layout
 * RootLayout is automatically applied to all views
 */
app.use(
  '*',
  jsxRenderer(({ children }) => {
    return <RootLayout>{children}</RootLayout>;
  })
);

app
  // Homepage
  // c.render() automatically applies jsxRenderer layout
  .get('/', (c) => {
    return c.render(<HomePage />);
  })

  // Health check API
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

    // 2. Fetch JSON data from users package API
    // @ts-expect-error - Workaround for getClient type inference issue
    const userDataRes = await users.api.users.$get();
    const { users: userList } = await userDataRes.json();

    // 3. Pass data to view component and render
    // RootLayout is automatically applied via c.render()
    return c.render(<DashboardPage users={userList} />);
  });

export type RootApp = typeof app;
export default app;
