/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { getClient } from '@kagaribi/core';
import { hc } from 'hono/client';
import type authApp from '../../auth/src/index.js';
import type protectedApiApp from '../../protected-api/src/index.js';

const app = new Hono();

// スタイル定義
const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .container {
    background: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 100%;
  }
  h1 {
    color: #333;
    margin-bottom: 10px;
    font-size: 28px;
  }
  .subtitle {
    color: #666;
    margin-bottom: 30px;
    font-size: 14px;
  }
  .form-group {
    margin-bottom: 20px;
  }
  label {
    display: block;
    color: #555;
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 14px;
  }
  input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s;
  }
  input:focus {
    outline: none;
    border-color: #667eea;
  }
  button {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
  }
  button:active {
    transform: translateY(0);
  }
  .demo-credentials {
    background: #f5f5f5;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 24px;
    font-size: 13px;
  }
  .demo-credentials p {
    color: #666;
    margin-bottom: 8px;
  }
  .demo-credentials code {
    background: #e0e0e0;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', monospace;
  }
  .error {
    background: #fee;
    color: #c33;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
  }
  .success {
    background: #efe;
    color: #3c3;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
  }
  .user-info {
    background: #f5f5f5;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  .user-info h2 {
    color: #333;
    margin-bottom: 12px;
    font-size: 18px;
  }
  .user-info p {
    color: #666;
    margin-bottom: 8px;
    font-size: 14px;
  }
  .api-response {
    background: #f5f5f5;
    padding: 16px;
    border-radius: 8px;
    margin-top: 20px;
    overflow-x: auto;
  }
  .api-response pre {
    font-family: 'Monaco', monospace;
    font-size: 12px;
    color: #333;
  }
  .logout-btn {
    background: #e0e0e0;
    color: #333;
    margin-top: 10px;
  }
  .logout-btn:hover {
    background: #d0d0d0;
  }
  .test-api-btn {
    margin-top: 10px;
  }
`;

/**
 * GET /
 * ホームページ（ログインページにリダイレクト）
 */
app.get('/', (c) => {
  return c.redirect('/login');
});

/**
 * GET /login
 * ログインフォーム UI
 */
app.get('/login', (c) => {
  const error = c.req.query('error');

  return c.html(
    <html>
      <head>
        <title>Auth Demo - Login</title>
        <style>{styles}</style>
      </head>
      <body>
        <div class="container">
          <h1>🔐 Auth Demo</h1>
          <p class="subtitle">Kagaribi JWT Authentication Demo</p>

          {error && <div class="error">{error}</div>}

          <div class="demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <p>Email: <code>alice@example.com</code></p>
            <p>Password: <code>password123</code></p>
            <p style="margin-top: 8px;">または</p>
            <p>Email: <code>bob@example.com</code></p>
            <p>Password: <code>password456</code></p>
          </div>

          <form method="post" action="/login">
            <div class="form-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="your@email.com"
              />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                required
                placeholder="Enter your password"
              />
            </div>
            <button type="submit">Login</button>
          </form>
        </div>
      </body>
    </html>
  );
});

/**
 * POST /login
 * ログイン処理（auth パッケージの API を呼び出し）
 */
app.post('/login', async (c) => {
  const formData = await c.req.parseBody();
  const { email, password } = formData;

  try {
    // auth パッケージの /auth/api/login を呼び出し
    const authClient = getClient<typeof authApp>('auth');
    // @ts-expect-error - getClient の型推論の問題を回避
    const response = await authClient.auth.api.login.$post({
      json: { email, password },
    });

    if (!response.ok) {
      return c.redirect('/login?error=Invalid+credentials');
    }

    const data = await response.json();

    // アクセストークンを Cookie に保存してダッシュボードにリダイレクト
    setCookie(c, 'accessToken', data.accessToken, {
      path: '/',
      httpOnly: true,
      maxAge: data.expiresIn,
    });

    return c.redirect('/dashboard');
  } catch (error) {
    return c.redirect('/login?error=Login+failed');
  }
});

/**
 * GET /dashboard
 * ダッシュボード UI（認証必須）
 */
app.get('/dashboard', async (c) => {
  const accessToken = getCookie(c, 'accessToken');

  if (!accessToken) {
    return c.redirect('/login?error=Please+login+first');
  }

  try {
    // protected-api パッケージの /api/profile を呼び出し
    const apiClient = getClient<typeof protectedApiApp>('protected-api');
    // @ts-expect-error - getClient の型推論の問題を回避
    const response = await apiClient.api.profile.$get(
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return c.redirect('/login?error=Session+expired');
    }

    const data = await response.json();

    return c.html(
      <html>
        <head>
          <title>Auth Demo - Dashboard</title>
          <style>{styles}</style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Dashboard</h1>
            <p class="subtitle">Welcome to your dashboard!</p>

            <div class="user-info">
              <h2>User Profile</h2>
              <p><strong>ID:</strong> {data.user.id}</p>
              <p><strong>Name:</strong> {data.user.name}</p>
              <p><strong>Email:</strong> {data.user.email}</p>
            </div>

            <button
              class="test-api-btn"
              onclick="testSecretApi()"
            >
              Test Secret API
            </button>

            <div id="api-result"></div>

            <form method="post" action="/logout">
              <button type="submit" class="logout-btn">Logout</button>
            </form>
          </div>

          <script>{`
            async function testSecretApi() {
              try {
                const response = await fetch('/api/secret', {
                  credentials: 'include'
                });
                const data = await response.json();

                document.getElementById('api-result').innerHTML =
                  '<div class="api-response"><pre>' +
                  JSON.stringify(data, null, 2) +
                  '</pre></div>';
              } catch (error) {
                document.getElementById('api-result').innerHTML =
                  '<div class="error">Failed to fetch API data</div>';
              }
            }
          `}</script>
        </body>
      </html>
    );
  } catch (error) {
    return c.redirect('/login?error=Failed+to+load+dashboard');
  }
});

/**
 * GET /api/secret
 * protected-api パッケージへのプロキシ（認証トークンを転送）
 */
app.get('/api/secret', async (c) => {
  const accessToken = getCookie(c, 'accessToken');

  if (!accessToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const apiClient = getClient<typeof protectedApiApp>('protected-api');
    // @ts-expect-error - getClient の型推論の問題を回避
    const response = await apiClient.api.secret.$get(
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return c.json({ error: 'Failed to fetch data' }, response.status);
    }

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /logout
 * ログアウト処理
 */
app.post('/logout', (c) => {
  deleteCookie(c, 'accessToken');
  return c.redirect('/login');
});

export default app;
