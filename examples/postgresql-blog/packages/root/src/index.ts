import { Hono } from 'hono';
import { html, raw } from 'hono/html';
import { getClient } from '@kagaribi/core';
import type { PostsApp } from '../../posts/src/index.js';

const app = new Hono()
  .get('/', (c) => {
    return c.html(html`
      <!DOCTYPE html>
      <html>
        <head><title>kagaribi PostgreSQL Blog</title></head>
        <body>
          <h1>kagaribi - PostgreSQL Blog Example</h1>
          <nav>
            <ul>
              <li><a href="/posts">Posts API (JSON)</a></li>
              <li><a href="/dashboard">Dashboard (cross-package call)</a></li>
              <li><a href="/health">Health Check</a></li>
            </ul>
          </nav>
        </body>
      </html>
    `);
  })
  .get('/health', (c) => {
    return c.json({ status: 'healthy', package: 'root' });
  })
  .get('/dashboard', async (c) => {
    const posts = getClient<PostsApp>('posts');
    const res = await posts.index.$get();
    const allPosts = await res.json();

    return c.html(html`
      <!DOCTYPE html>
      <html>
        <head><title>Dashboard - kagaribi Blog</title></head>
        <body>
          <h1>Dashboard</h1>
          <p>This page is rendered by <strong>root</strong>,
          fetching data from <strong>posts</strong> via getClient().</p>
          <p><a href="/">Back to home</a></p>
          <h2>All Posts (${allPosts.length} total)</h2>
          <ul>
            ${raw(allPosts.map((p: Record<string, unknown>) => `<li><strong>${p.title}</strong>: ${p.content ?? '(no content)'}</li>`).join(''))}
          </ul>
        </body>
      </html>
    `);
  });

export type RootApp = typeof app;
export default app;
