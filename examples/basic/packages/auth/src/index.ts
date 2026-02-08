import { Hono } from 'hono';
import { html } from 'hono/html';

const app = new Hono()
  // API
  .post('/api/login', async (c) => {
    const body = await c.req.json<{ username: string; password: string }>();
    // サンプル: 固定のトークンを返す
    if (body.username === 'admin' && body.password === 'password') {
      return c.json({ token: 'sample-jwt-token', user: { id: '1', name: 'Admin' } });
    }
    return c.json({ error: 'Invalid credentials' }, 401);
  })
  .get('/api/verify', (c) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader === 'Bearer sample-jwt-token') {
      return c.json({ valid: true, user: { id: '1', name: 'Admin' } });
    }
    return c.json({ valid: false }, 401);
  })
  // UI: WebComponent
  .get('/login', (c) => {
    return c.html(html`
      <kagaribi-login>
        <template shadowrootmode="open">
          <style>
            :host { display: block; max-width: 400px; margin: 2rem auto; }
            form { display: flex; flex-direction: column; gap: 1rem; }
            input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
            button { padding: 0.5rem 1rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
          </style>
          <h2>Login</h2>
          <form>
            <input type="text" name="username" placeholder="Username" />
            <input type="password" name="password" placeholder="Password" />
            <button type="submit">Login</button>
          </form>
        </template>
      </kagaribi-login>
      <script>
        if (!customElements.get('kagaribi-login')) {
          customElements.define('kagaribi-login', class extends HTMLElement {});
        }
      </script>
    `);
  });

export type AuthApp = typeof app;
export default app;
