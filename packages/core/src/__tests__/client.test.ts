import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  registerLocalClient,
  getClient,
  clearClientRegistry,
} from '../client.js';

describe('getClient - ローカルモード', () => {
  beforeEach(() => {
    clearClientRegistry();
  });

  it('ローカル登録されたパッケージのAPIをhcで呼び出せる', async () => {
    // テスト用Honoアプリを作成
    const usersApp = new Hono()
      .get('/api/users', (c) => {
        return c.json({ users: [{ id: '1', name: 'Alice' }] });
      })
      .get('/api/users/:id', (c) => {
        const id = c.req.param('id');
        return c.json({ id, name: 'Alice' });
      });

    type UsersApp = typeof usersApp;

    // ローカルクライアントとして登録
    registerLocalClient({ name: 'users', app: usersApp });

    // getClientで取得
    const client = getClient<UsersApp>('users');

    // hcインタフェースで呼び出し
    const res = await client.api.users.$get();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({ users: [{ id: '1', name: 'Alice' }] });
  });

  it('パスパラメータ付きのルートを呼び出せる', async () => {
    const app = new Hono().get('/items/:id', (c) => {
      return c.json({ id: c.req.param('id'), name: 'Test Item' });
    });

    type ItemsApp = typeof app;

    registerLocalClient({ name: 'items', app });

    const client = getClient<ItemsApp>('items');
    const res = await client.items[':id'].$get({ param: { id: '42' } });
    const data = await res.json();
    expect(data).toEqual({ id: '42', name: 'Test Item' });
  });

  it('POSTリクエストを送信できる', async () => {
    const app = new Hono().post('/api/create', async (c) => {
      const body = await c.req.json();
      return c.json({ created: true, ...body }, 201);
    });

    type CreateApp = typeof app;

    registerLocalClient({ name: 'create', app });

    const client = getClient<CreateApp>('create');
    const res = await client.api.create.$post({
      json: { name: 'New Item' },
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toEqual({ created: true, name: 'New Item' });
  });

  it('未登録のパッケージを取得するとエラーが発生する', () => {
    expect(() => getClient('nonexistent')).toThrow(
      '[kagaribi] Package "nonexistent" is not registered'
    );
  });

  it('HTMLレスポンス（WebComponent）を取得できる', async () => {
    const app = new Hono().get('/view/card', (c) => {
      return c.html('<my-card><h1>Hello</h1></my-card>');
    });

    type CardApp = typeof app;

    registerLocalClient({ name: 'card', app });

    const client = getClient<CardApp>('card');
    const res = await client.view.card.$get();
    const html = await res.text();
    expect(html).toContain('<my-card>');
    expect(html).toContain('<h1>Hello</h1>');
  });
});
