import { Hono } from 'hono';
import { LoginForm } from './views/LoginForm.js';

const app = new Hono();

app
  // API: Login endpoint
  .post('/api/login', async (c) => {
    const body = await c.req.json<{ username: string; password: string }>();

    // Sample: Return fixed token
    if (body.username === 'admin' && body.password === 'password') {
      return c.json({ token: 'sample-jwt-token', user: { id: '1', name: 'Admin' } });
    }

    return c.json({ error: 'Invalid credentials' }, 401);
  })

  // API: Token verification endpoint
  .get('/api/verify', (c) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader === 'Bearer sample-jwt-token') {
      return c.json({ valid: true, user: { id: '1', name: 'Admin' } });
    }

    return c.json({ valid: false }, 401);
  })

  // View: Login form
  // Route handler only calls view component
  .get('/login', (c) => {
    return c.html(<LoginForm />);
  });

export type AuthApp = typeof app;
export default app;
