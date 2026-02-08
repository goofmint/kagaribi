import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createContextHeaders, kagaribiContextMiddleware } from '../context.js';

const TEST_SECRET = 'test-shared-secret-key';

describe('コンテキスト伝播', () => {
  it('コンテキストヘッダーの作成と検証ができる', async () => {
    const contextData = {
      user: { id: '1', name: 'Alice' },
      requestId: 'req-123',
    };

    const headers = await createContextHeaders(contextData, TEST_SECRET);

    expect(headers['X-Kagaribi-Context']).toBeDefined();
    expect(headers['X-Kagaribi-Signature']).toBeDefined();

    // コンテキストJSONが正しい
    const parsed = JSON.parse(headers['X-Kagaribi-Context']);
    expect(parsed.user.name).toBe('Alice');
    expect(parsed.requestId).toBe('req-123');
  });

  it('kagaribiContextMiddlewareが正しい署名のコンテキストを復元する', async () => {
    const contextData = {
      user: { id: '1', name: 'Alice' },
      requestId: 'req-456',
    };

    const contextHeaders = await createContextHeaders(contextData, TEST_SECRET);

    // リモートパッケージのHonoアプリをシミュレート
    const remoteApp = new Hono();
    remoteApp.use('*', kagaribiContextMiddleware(TEST_SECRET));
    remoteApp.get('/test', (c) => {
      return c.json({
        user: c.get('user' as never),
        requestId: c.get('requestId' as never),
      });
    });

    const res = await remoteApp.request('/test', {
      headers: contextHeaders,
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toEqual({ id: '1', name: 'Alice' });
    expect(data.requestId).toBe('req-456');
  });

  it('不正な署名のコンテキストを拒否する', async () => {
    const contextData = { user: { id: '1' } };
    const contextHeaders = await createContextHeaders(contextData, TEST_SECRET);

    // 署名を改ざん
    contextHeaders['X-Kagaribi-Signature'] = 'invalid-signature';

    const remoteApp = new Hono();
    remoteApp.use('*', kagaribiContextMiddleware(TEST_SECRET));
    remoteApp.get('/test', (c) => c.json({ ok: true }));

    const res = await remoteApp.request('/test', {
      headers: contextHeaders,
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Invalid context signature');
  });

  it('コンテキストヘッダーがない場合はそのまま通過する', async () => {
    const remoteApp = new Hono();
    remoteApp.use('*', kagaribiContextMiddleware(TEST_SECRET));
    remoteApp.get('/test', (c) => c.json({ ok: true }));

    const res = await remoteApp.request('/test');

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
