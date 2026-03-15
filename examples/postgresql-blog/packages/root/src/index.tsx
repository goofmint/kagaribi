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
    try {
      const posts = getClient<PostsApp>('posts');
      const res = await posts.index.$get();

      if (!res.ok) {
        console.error('Failed to fetch posts:', res.status, res.statusText);
        return c.html(<Dashboard posts={[]} error="Failed to load posts" />);
      }

      const allPosts = (await res.json()) as Array<{
        id: number;
        title: string;
        content: string | null;
        createdAt: string;
      }>;

      return c.html(<Dashboard posts={allPosts} />);
    } catch (error) {
      console.error('Error fetching posts:', error);
      return c.html(<Dashboard posts={[]} error="An error occurred while loading posts" />);
    }
  });

export type RootApp = typeof app;
export default app;
