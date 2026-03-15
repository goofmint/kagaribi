import { Hono } from 'hono';
import { getClient } from '@kagaribi/core';
import type { PostsApp } from '../../posts/src/index.js';
import { Dashboard } from '../views/Dashboard';

const app = new Hono()
  .get('/', (c) => {
    return c.json({
      message: 'kagaribi PostgreSQL Blog API',
      endpoints: {
        health: '/health',
        posts: '/posts',
        users: '/users',
        dashboard: '/dashboard',
      },
    });
  })
  .get('/health', (c) => {
    return c.json({ status: 'healthy', package: 'root' });
  })
  .get('/dashboard', async (c) => {
    const posts = getClient<PostsApp>('posts');
    const res = await posts.index.$get();
    const allPosts = (await res.json()) as Array<{
      id: number;
      title: string;
      content: string | null;
      createdAt: string;
    }>;

    return c.html(<Dashboard posts={allPosts} />);
  });

export type RootApp = typeof app;
export default app;
