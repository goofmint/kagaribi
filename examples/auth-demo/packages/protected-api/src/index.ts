import { Hono } from 'hono';
import { jwt, getAuthPayloadFromContext, kagaribiContextMiddleware } from '@kagaribi/core';
import type { AuthUser } from '@kagaribi/core';

type Bindings = {
  JWT_SECRET: string;
  SHARED_SECRET: string;
};

type Variables = {
  jwtPayload: {
    sub: string;
    user?: AuthUser;
    [key: string]: unknown;
  };
  user?: AuthUser;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * 環境変数を取得するヘルパー関数
 * 環境変数が設定されていない場合は明確にエラーを出す
 */
function getEnvVar(env: Bindings, key: keyof Bindings): string {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} environment variable is required`);
  }
  return value;
}

// FaaS 分離デプロイ時は、Kagaribi コンテキストミドルウェアで署名付きコンテキストを受信
// ローカル実行時はこのミドルウェアはスキップされる（ヘッダーが存在しない）
app.use('*', async (c, next) => {
  const sharedSecret = getEnvVar(c.env, 'SHARED_SECRET');
  const contextMiddleware = kagaribiContextMiddleware(sharedSecret);
  return contextMiddleware(c, next);
});

// JWT ミドルウェアを適用して全ルートを保護
app.use('*', async (c, next) => {
  const jwtSecret = getEnvVar(c.env, 'JWT_SECRET');
  const jwtMiddleware = jwt({ secret: jwtSecret, alg: 'HS256' });
  return jwtMiddleware(c, next);
});

/**
 * GET /api/profile
 * 認証済みユーザーのプロフィール情報を返却
 */
app.get('/profile', (c) => {
  const payload = getAuthPayloadFromContext(c);

  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Kagaribi コンテキスト伝播から復元されたユーザー情報を優先
  const user: AuthUser = c.get('user') || payload.user || {
    id: String(payload.sub),
  };

  return c.json({
    user,
    message: 'This is your profile data',
  });
});

/**
 * GET /api/secret
 * 認証必須のサンプルデータを返却
 */
app.get('/secret', (c) => {
  const payload = getAuthPayloadFromContext(c);

  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user: AuthUser = c.get('user') || payload.user || {
    id: String(payload.sub),
  };

  return c.json({
    message: 'This is secret data only for authenticated users',
    timestamp: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name || 'Unknown',
    },
    secretData: {
      apiKey: 'sk_test_1234567890',
      plan: 'premium',
      quota: {
        used: 42,
        limit: 1000,
      },
    },
  });
});

export default app;
