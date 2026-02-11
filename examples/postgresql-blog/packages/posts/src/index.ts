import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDbMiddleware } from '@kagaribi/core';
import { getDb, initDb, schema } from '../../../db/index.js';

const app = new Hono()
  .use('*', createDbMiddleware({ initFn: initDb }))
  // 投稿一覧
  .get('/', async (c) => {
    const db = getDb();
    const allPosts = await db.select().from(schema.posts);
    return c.json(allPosts);
  })
  // 投稿取得
  .get('/:id', async (c) => {
    const db = getDb();
    const id = Number(c.req.param('id'));
    const [post] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, id));
    if (!post) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json(post);
  })
  // 投稿作成
  .post('/', async (c) => {
    const db = getDb();
    const body = await c.req.json<{ title: string; content?: string }>();
    const [created] = await db
      .insert(schema.posts)
      .values({ title: body.title, content: body.content ?? null })
      .returning();
    return c.json(created, 201);
  })
  // 投稿削除
  .delete('/:id', async (c) => {
    const db = getDb();
    const id = Number(c.req.param('id'));
    const [deleted] = await db
      .delete(schema.posts)
      .where(eq(schema.posts.id, id))
      .returning();
    if (!deleted) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json({ message: 'Deleted' });
  });

export type PostsApp = typeof app;
export default app;
