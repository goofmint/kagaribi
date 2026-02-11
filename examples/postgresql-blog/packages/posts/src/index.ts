import { Hono } from 'hono';
import { createDbMiddleware } from '@kagaribi/core';
import { initDb } from '../../../db/index.js';
import * as Posts from '../../../db/models/posts.js';

const app = new Hono()
  .use('*', createDbMiddleware({ initFn: initDb }))
  // 投稿一覧
  .get('/', async (c) => {
    const allPosts = await Posts.findAll();
    return c.json(allPosts);
  })
  // 投稿取得
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const post = await Posts.findById(id);
    if (!post) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json(post);
  })
  // 投稿作成
  .post('/', async (c) => {
    const body = await c.req.json<{ title: string; content?: string }>();
    const created = await Posts.create({
      title: body.title,
      content: body.content ?? null,
    });
    return c.json(created, 201);
  })
  // 投稿削除
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const deleted = await Posts.remove(id);
    if (!deleted) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json({ message: 'Deleted' });
  });

export type PostsApp = typeof app;
export default app;
