# Auth Demo - カスタマイズガイド

このガイドでは、auth-demo を独自の要件に合わせてカスタマイズする方法を説明します。

## 目次

- [データベース統合](#データベース統合)
- [カスタム認証ロジック](#カスタム認証ロジック)
- [UI のカスタマイズ](#ui-のカスタマイズ)
- [エラーハンドリングの拡張](#エラーハンドリングの拡張)
- [追加機能の実装](#追加機能の実装)

---

## データベース統合

デモではハードコードされたユーザーデータを使用していますが、実際のアプリケーションではデータベースを使用します。

### PostgreSQL + Drizzle ORM の統合

#### 1. プロジェクトの初期化

```bash
# プロジェクトを DB 対応で初期化
kagaribi init my-auth-app --node --db postgresql
```

#### 2. ユーザーテーブルの定義

`db/schema.ts`:
```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  hashedPassword: text('hashed_password').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### 3. Auth パッケージの修正

```typescript
import { Hono } from 'hono';
import { createTokenPair } from '@kagaribi/core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { users } from '../../../db/schema.js';
import { hash, verify as verifyHash } from '@node-rs/bcrypt';

type Bindings = {
  JWT_SECRET: string;
  DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  // データベース接続
  const db = drizzle(c.env.DATABASE_URL);

  // ユーザーを検索
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // パスワード検証
  const isValid = await verifyHash(password, user.hashedPassword);

  if (!isValid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // トークンペア生成
  const { accessToken, refreshToken, expiresIn } = await createTokenPair(
    {
      sub: user.id,
      email: user.email,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    },
    c.env.JWT_SECRET
  );

  return c.json({
    accessToken,
    refreshToken,
    expiresIn,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

export default app;
```

#### 4. ユーザー登録エンドポイントの追加

```typescript
app.post('/register', async (c) => {
  const { email, password, name } = await c.req.json();

  const db = drizzle(c.env.DATABASE_URL);

  // パスワードをハッシュ化
  const hashedPassword = await hash(password, 10);

  try {
    // ユーザーを作成
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        hashedPassword,
        name,
      })
      .returning();

    // トークンペア生成
    const { accessToken, refreshToken, expiresIn } = await createTokenPair(
      {
        sub: newUser.id,
        email: newUser.email,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      },
      c.env.JWT_SECRET
    );

    return c.json({
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return c.json({ error: 'Email already exists' }, 409);
    }
    throw error;
  }
});
```

---

## カスタム認証ロジック

### OAuth 2.0 / OpenID Connect の統合

#### GitHub OAuth の例

```typescript
import { Hono } from 'hono';
import { createTokenPair } from '@kagaribi/core';

const app = new Hono();

// GitHub OAuth 開始
app.get('/oauth/github', (c) => {
  const redirectUri = `${c.req.url}/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=user:email`;
  return c.redirect(githubAuthUrl);
});

// GitHub OAuth コールバック
app.get('/oauth/github/callback', async (c) => {
  const code = c.req.query('code');

  // アクセストークンを取得
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const { access_token } = await tokenResponse.json();

  // ユーザー情報を取得
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const githubUser = await userResponse.json();

  // データベースでユーザーを検索または作成
  const user = await db.findOrCreateUser({
    email: githubUser.email,
    name: githubUser.name,
    githubId: githubUser.id,
  });

  // JWT トークンを発行
  const { accessToken, refreshToken } = await createTokenPair(
    {
      sub: user.id,
      email: user.email,
      user: { id: user.id, email: user.email, name: user.name },
    },
    JWT_SECRET
  );

  // Cookie に保存してダッシュボードへリダイレクト
  setCookie(c, 'accessToken', accessToken, { httpOnly: true });
  return c.redirect('/dashboard');
});
```

### 多要素認証（MFA）の追加

```typescript
import { authenticator } from 'otplib';

// MFA セットアップ
app.post('/mfa/setup', async (c) => {
  const user = await getAuthenticatedUser(c);

  // シークレット生成
  const secret = authenticator.generateSecret();

  // QR コード用の URL 生成
  const otpauth = authenticator.keyuri(user.email, 'MyApp', secret);

  // ユーザーのレコードに保存（まだ有効化しない）
  await db.updateUser(user.id, { mfaSecret: secret, mfaEnabled: false });

  return c.json({ otpauth, secret });
});

// MFA 有効化
app.post('/mfa/enable', async (c) => {
  const user = await getAuthenticatedUser(c);
  const { token } = await c.req.json();

  // トークンを検証
  const isValid = authenticator.verify({ token, secret: user.mfaSecret });

  if (!isValid) {
    return c.json({ error: 'Invalid token' }, 400);
  }

  // MFA を有効化
  await db.updateUser(user.id, { mfaEnabled: true });

  return c.json({ success: true });
});

// ログイン時の MFA 検証
app.post('/login', async (c) => {
  const { email, password, mfaToken } = await c.req.json();

  const user = await authenticateUser(email, password);

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // MFA が有効な場合はトークンを検証
  if (user.mfaEnabled) {
    if (!mfaToken) {
      return c.json({ error: 'MFA token required', requiresMfa: true }, 401);
    }

    const isValid = authenticator.verify({ token: mfaToken, secret: user.mfaSecret });

    if (!isValid) {
      return c.json({ error: 'Invalid MFA token' }, 401);
    }
  }

  // トークン発行
  const { accessToken, refreshToken } = await createTokenPair(...);

  return c.json({ accessToken, refreshToken, user });
});
```

---

## UI のカスタマイズ

### React への移行

現在の Hono JSX から React への移行：

```typescript
// packages/root/src/index.tsx
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';

const app = new Hono();

// 静的ファイルの配信
app.use('/static/*', serveStatic({ root: './public' }));

// SPA のエントリーポイント
app.get('*', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Auth Demo</title>
        <link rel="stylesheet" href="/static/styles.css">
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/static/main.jsx"></script>
      </body>
    </html>
  `);
});

// API エンドポイント
app.post('/api/login', async (c) => {
  // 既存の実装
});

export default app;
```

`public/main.jsx`:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

### テーマシステムの追加

```typescript
// packages/root/src/theme.ts
export const themes = {
  light: {
    primary: '#667eea',
    background: '#ffffff',
    text: '#333333',
  },
  dark: {
    primary: '#764ba2',
    background: '#1a1a1a',
    text: '#ffffff',
  },
};

// packages/root/src/index.tsx
app.get('/login', (c) => {
  const theme = c.req.query('theme') || 'light';
  const colors = themes[theme];

  return c.html(
    <html>
      <head>
        <style>{`
          :root {
            --color-primary: ${colors.primary};
            --color-background: ${colors.background};
            --color-text: ${colors.text};
          }
          body {
            background: var(--color-background);
            color: var(--color-text);
          }
        `}</style>
      </head>
      <body>
        {/* ... */}
      </body>
    </html>
  );
});
```

---

## エラーハンドリングの拡張

### グローバルエラーハンドラー

```typescript
import { Hono } from 'hono';

const app = new Hono();

// グローバルエラーハンドラー
app.onError((err, c) => {
  console.error(`Error: ${err.message}`, err);

  // JWT エラー
  if (err.message.includes('jwt') || err.message.includes('token')) {
    return c.json({
      error: 'Authentication failed',
      message: 'Invalid or expired token',
    }, 401);
  }

  // バリデーションエラー
  if (err.name === 'ValidationError') {
    return c.json({
      error: 'Validation failed',
      details: err.details,
    }, 400);
  }

  // データベースエラー
  if (err.code?.startsWith('23')) { // PostgreSQL constraint errors
    return c.json({
      error: 'Database constraint violation',
      message: 'The operation violates a database constraint',
    }, 409);
  }

  // デフォルトエラー
  return c.json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  }, 500);
});
```

### カスタム認証エラー

```typescript
class AuthenticationError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// 使用例
app.post('/admin/users', async (c) => {
  const user = await getAuthenticatedUser(c);

  if (!user) {
    throw new AuthenticationError('Not authenticated');
  }

  if (user.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }

  // ...
});
```

---

## 追加機能の実装

### パスワードリセット

```typescript
import { randomBytes } from 'crypto';

// パスワードリセットリクエスト
app.post('/password/reset-request', async (c) => {
  const { email } = await c.req.json();

  const user = await db.findUserByEmail(email);

  if (!user) {
    // セキュリティ: ユーザーの存在を明かさない
    return c.json({ message: 'If the email exists, a reset link has been sent' });
  }

  // リセットトークンを生成
  const resetToken = randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1時間

  // データベースに保存
  await db.updateUser(user.id, { resetToken, resetTokenExpiry });

  // メール送信（実装は省略）
  await sendEmail({
    to: user.email,
    subject: 'Password Reset',
    body: `Reset link: https://example.com/password/reset?token=${resetToken}`,
  });

  return c.json({ message: 'If the email exists, a reset link has been sent' });
});

// パスワードリセット実行
app.post('/password/reset', async (c) => {
  const { token, newPassword } = await c.req.json();

  const user = await db.findUserByResetToken(token);

  if (!user || user.resetTokenExpiry < new Date()) {
    return c.json({ error: 'Invalid or expired reset token' }, 400);
  }

  // パスワードをハッシュ化
  const hashedPassword = await hash(newPassword, 10);

  // パスワードを更新してトークンをクリア
  await db.updateUser(user.id, {
    hashedPassword,
    resetToken: null,
    resetTokenExpiry: null,
  });

  return c.json({ message: 'Password reset successful' });
});
```

### アクティビティログ

```typescript
// ログインアクティビティを記録
app.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const user = await authenticateUser(email, password);

  if (user) {
    // ログインアクティビティを記録
    await db.createLoginLog({
      userId: user.id,
      ipAddress: c.req.header('x-real-ip') || c.req.header('x-forwarded-for'),
      userAgent: c.req.header('user-agent'),
      success: true,
      timestamp: new Date(),
    });
  }

  // ...
});

// ユーザーのアクティビティを取得
app.get('/account/activity', async (c) => {
  const user = await getAuthenticatedUser(c);

  const logs = await db.getLoginLogs(user.id, { limit: 50 });

  return c.json({ logs });
});
```

---

## まとめ

auth-demo は柔軟にカスタマイズできるように設計されています：

- ✅ データベース統合（PostgreSQL、MySQL、SQLite）
- ✅ 認証方式の拡張（OAuth、MFA、パスワードレス）
- ✅ UI フレームワークの変更（React、Vue、Svelte）
- ✅ エラーハンドリングの強化
- ✅ 追加機能の実装（パスワードリセット、アクティビティログ）

これらのカスタマイズ例を参考に、独自のアプリケーションを構築してください。
