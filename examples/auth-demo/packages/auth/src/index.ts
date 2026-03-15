import { Hono } from 'hono';
import { sign, jwt, verify, createTokenPair, JWT_DEFAULTS } from '@kagaribi/core';

type Bindings = {
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// デモ用のハードコードされたユーザー情報
const DEMO_USERS = [
  { id: 'user1', email: 'alice@example.com', password: 'password123', name: 'Alice' },
  { id: 'user2', email: 'bob@example.com', password: 'password456', name: 'Bob' },
];

type DemoUser = typeof DEMO_USERS[number];
type SafeUser = Omit<DemoUser, 'password'>;

/**
 * JWT シークレットを取得するヘルパー関数
 * 環境変数が設定されていない場合は明確にエラーを出す
 */
function getJwtSecret(env: Bindings): string {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return env.JWT_SECRET;
}

/**
 * パスワードを除いた安全なユーザーオブジェクトを生成
 */
function toSafeUser(user: DemoUser): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

/**
 * POST /auth/api/login
 * ユーザー認証を行い、アクセストークンとリフレッシュトークンを発行
 */
app.post('/api/login', async (c) => {
  const jwtSecret = getJwtSecret(c.env);
  const { email, password } = await c.req.json();

  // デモ用の認証チェック
  const user = DEMO_USERS.find((u) => u.email === email && u.password === password);

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // アクセストークンとリフレッシュトークンを生成
  const safeUser = toSafeUser(user);
  const { accessToken, refreshToken, expiresIn } = await createTokenPair(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      user: safeUser,
    },
    jwtSecret
  );

  return c.json({
    accessToken,
    refreshToken,
    expiresIn,
    user: safeUser,
  });
});

/**
 * POST /auth/api/refresh
 * リフレッシュトークンを使用してアクセストークンを再発行
 */
app.post('/api/refresh', async (c) => {
  const jwtSecret = getJwtSecret(c.env);
  const { refreshToken } = await c.req.json();

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400);
  }

  try {
    // リフレッシュトークンを検証
    const payload = await verify(refreshToken, jwtSecret, 'HS256');

    if (payload.type !== 'refresh') {
      return c.json({ error: 'Invalid token type' }, 401);
    }

    // ユーザー情報を取得
    const user = DEMO_USERS.find((u) => u.id === payload.sub);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const safeUser = toSafeUser(user);
    const now = Math.floor(Date.now() / 1000);

    // 新しいアクセストークンを生成
    const accessToken = await sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        user: safeUser,
        iat: now,
        exp: now + JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN,
      },
      jwtSecret,
      JWT_DEFAULTS.ALGORITHM
    );

    return c.json({
      accessToken,
      expiresIn: JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN,
    });
  } catch (error) {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
});

/**
 * GET /auth/api/verify
 * トークン検証エンドポイント（JWT ミドルウェアで保護）
 */
app.use('/api/verify', async (c, next) => {
  const jwtSecret = getJwtSecret(c.env);
  const jwtMiddleware = jwt({ secret: jwtSecret, alg: 'HS256' });
  return jwtMiddleware(c, next);
});
app.get('/api/verify', (c) => {
  const payload = c.get('jwtPayload');
  return c.json({
    valid: true,
    user: payload.user || {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    },
  });
});

export default app;
