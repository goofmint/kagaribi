# Views Guide

This guide explains how to create HTML views in Kagaribi applications.

## 🚨 CRITICAL RULE: NO HTML IN .ts FILES

**NEVER write HTML template literals in `.ts` files. ALWAYS use `.tsx` files with React/JSX components.**

### ❌ WRONG - HTML Template Literals in .ts

```typescript
// ❌ NEVER DO THIS - packages/root/src/index.ts
import { Hono } from 'hono';

const app = new Hono()
  .get('/dashboard', (c) => {
    // ❌ FORBIDDEN: HTML template literal in .ts file
    return c.html(`
      <html>
        <head><title>Dashboard</title></head>
        <body>
          <h1>Dashboard</h1>
        </body>
      </html>
    `);
  });
```

**Why this is forbidden:**
- No type safety
- No syntax highlighting
- Hard to maintain
- Prone to XSS vulnerabilities
- Not compatible with Kagaribi's architecture

### ✅ CORRECT - React/JSX Components in .tsx

```typescript
// ✅ CORRECT - packages/root/src/index.tsx
import { Hono } from 'hono';
import { Dashboard } from '../views/Dashboard';

const app = new Hono()
  .get('/dashboard', async (c) => {
    const posts = await getPosts();
    return c.html(<Dashboard posts={posts} />);
  });
```

```tsx
// ✅ CORRECT - packages/root/views/Dashboard.tsx
import { FC } from 'hono/jsx';

interface DashboardProps {
  posts: Array<{
    id: number;
    title: string;
    content: string | null;
  }>;
}

export const Dashboard: FC<DashboardProps> = ({ posts }) => {
  return (
    <html>
      <head>
        <title>Dashboard</title>
      </head>
      <body>
        <h1>Dashboard</h1>
        <ul>
          {posts.map((post) => (
            <li key={post.id}>{post.title}</li>
          ))}
        </ul>
      </body>
    </html>
  );
};
```

## File Organization

### Recommended Structure

```
packages/
  root/
    src/
      index.tsx          # Routes (use .tsx if rendering views)
    views/
      Dashboard.tsx      # View components
      Layout.tsx
      PostDetail.tsx
```

### When to Use .ts vs .tsx

- **Use `.ts`** - For routes that only return JSON (APIs)
- **Use `.tsx`** - For routes that render HTML views

```typescript
// ✅ .ts is OK for JSON APIs
// packages/api/src/index.ts
const app = new Hono()
  .get('/', (c) => c.json({ message: 'API' }))
  .post('/', async (c) => {
    const data = await c.req.json();
    return c.json(data, 201);
  });
```

```tsx
// ✅ .tsx is REQUIRED for HTML views
// packages/web/src/index.tsx
import { HomePage } from '../views/HomePage';

const app = new Hono()
  .get('/', (c) => c.html(<HomePage />));
```

## Creating View Components

### Basic Component

```tsx
// packages/root/views/HomePage.tsx
import { FC } from 'hono/jsx';

export const HomePage: FC = () => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Home</title>
      </head>
      <body>
        <h1>Welcome to Kagaribi</h1>
      </body>
    </html>
  );
};
```

### Component with Props

```tsx
// packages/root/views/PostDetail.tsx
import { FC } from 'hono/jsx';

interface Post {
  id: number;
  title: string;
  content: string | null;
  createdAt: string;
}

interface PostDetailProps {
  post: Post;
}

export const PostDetail: FC<PostDetailProps> = ({ post }) => {
  return (
    <html>
      <head>
        <title>{post.title}</title>
      </head>
      <body>
        <article>
          <h1>{post.title}</h1>
          <time datetime={post.createdAt}>
            {new Date(post.createdAt).toLocaleDateString()}
          </time>
          <div>{post.content}</div>
        </article>
      </body>
    </html>
  );
};
```

### Layout Component

```tsx
// packages/root/views/Layout.tsx
import { FC, PropsWithChildren } from 'hono/jsx';

interface LayoutProps {
  title: string;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({ title, children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header>
          <nav>
            <a href="/">Home</a>
            <a href="/posts">Posts</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <p>&copy; 2026 My App</p>
        </footer>
      </body>
    </html>
  );
};
```

Usage:

```tsx
// packages/root/views/Dashboard.tsx
import { FC } from 'hono/jsx';
import { Layout } from './Layout';

export const Dashboard: FC = () => {
  return (
    <Layout title="Dashboard">
      <h1>Dashboard</h1>
      <p>Welcome back!</p>
    </Layout>
  );
};
```

## Fetching Data for Views

### Using RPC Client

```tsx
// packages/root/src/index.tsx
import { Hono } from 'hono';
import { getClient } from '@kagaribi/core';
import type { PostsApp } from '../../posts/src/index';
import { Dashboard } from '../views/Dashboard';

const app = new Hono()
  .get('/dashboard', async (c) => {
    // Fetch data from posts package
    const postsClient = getClient<PostsApp>('posts');
    const res = await postsClient.index.$get();
    const posts = await res.json();

    return c.html(<Dashboard posts={posts} />);
  });

export default app;
```

### Using Model Helpers Directly

```tsx
// packages/root/src/index.tsx
import { Hono } from 'hono';
import { createDb, createDbMiddleware } from '@kagaribi/core';
import * as schema from '../../../db/schema.js';
import { Posts } from '../../../db/models/posts';
import { PostsList } from '../views/PostsList';

const { initDb } = createDb('postgresql', schema);

const app = new Hono()
  .use('*', createDbMiddleware({ initFn: initDb }))
  .get('/posts', async (c) => {
    const posts = await Posts.findAll();
    return c.html(<PostsList posts={posts} />);
  });

export default app;
```

## Styling

### Inline Styles

```tsx
export const StyledComponent: FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
      <h1 style={{ color: '#333' }}>Styled Content</h1>
    </div>
  );
};
```

### CSS Classes

```tsx
// packages/root/views/Card.tsx
export const Card: FC<{ title: string; content: string }> = ({ title, content }) => {
  return (
    <div class="card">
      <h2 class="card-title">{title}</h2>
      <p class="card-content">{content}</p>
    </div>
  );
};
```

Serve static CSS:

```typescript
// packages/root/src/index.tsx
import { serveStatic } from '@hono/node-server/serve-static';

const app = new Hono()
  .use('/static/*', serveStatic({ root: './public' }))
  .get('/', (c) => c.html(<HomePage />));
```

## Security Best Practices

### Auto-Escaping

Hono JSX automatically escapes HTML to prevent XSS attacks:

```tsx
const userInput = '<script>alert("XSS")</script>';

// ✅ Automatically escaped - safe
<div>{userInput}</div>
// Renders: &lt;script&gt;alert("XSS")&lt;/script&gt;
```

### Raw HTML (Use with Caution)

```tsx
import { raw } from 'hono/html';

// ⚠️ Only use with trusted content
<div>{raw(trustedHtmlString)}</div>
```

## TypeScript Configuration

Ensure your `tsconfig.json` supports JSX:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  }
}
```

## Common Patterns

### Conditional Rendering

```tsx
export const UserGreeting: FC<{ user?: { name: string } }> = ({ user }) => {
  return (
    <div>
      {user ? (
        <p>Welcome back, {user.name}!</p>
      ) : (
        <p>Please log in.</p>
      )}
    </div>
  );
};
```

### List Rendering

```tsx
export const PostsList: FC<{ posts: Post[] }> = ({ posts }) => {
  return (
    <ul>
      {posts.length > 0 ? (
        posts.map((post) => (
          <li key={post.id}>
            <a href={`/posts/${post.id}`}>{post.title}</a>
          </li>
        ))
      ) : (
        <li>No posts found.</li>
      )}
    </ul>
  );
};
```

### Forms

```tsx
export const LoginForm: FC = () => {
  return (
    <form action="/login" method="POST">
      <div>
        <label for="email">Email:</label>
        <input type="email" id="email" name="email" required />
      </div>
      <div>
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required />
      </div>
      <button type="submit">Log In</button>
    </form>
  );
};
```

## Testing Views

```typescript
// packages/root/src/index.test.ts
import { describe, it, expect } from 'vitest';
import app from './index';

describe('Views', () => {
  it('GET /dashboard - should render HTML', async () => {
    const res = await app.request('/dashboard');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('<h1>Dashboard</h1>');
  });
});
```

## Migration from HTML Template Literals

If you have existing code with HTML template literals, migrate it:

### Before (❌ Wrong)

```typescript
// packages/root/src/index.ts
const app = new Hono()
  .get('/', (c) => {
    return c.html(`
      <html>
        <body><h1>Home</h1></body>
      </html>
    `);
  });
```

### After (✅ Correct)

1. Rename `index.ts` to `index.tsx`
2. Create view component:

```tsx
// packages/root/views/HomePage.tsx
import { FC } from 'hono/jsx';

export const HomePage: FC = () => {
  return (
    <html>
      <body>
        <h1>Home</h1>
      </body>
    </html>
  );
};
```

3. Update route:

```tsx
// packages/root/src/index.tsx
import { HomePage } from '../views/HomePage';

const app = new Hono()
  .get('/', (c) => c.html(<HomePage />));
```

## Summary

✅ **DO:**
- Use `.tsx` files for routes that render HTML
- Create view components in `views/` directory
- Use TypeScript interfaces for props
- Leverage Hono's JSX auto-escaping

❌ **DON'T:**
- Write HTML template literals in `.ts` files
- Mix view logic with route logic
- Use `raw()` with untrusted user input

## Examples

See the [PostgreSQL Blog Example](../../examples/postgresql-blog/) for a complete implementation.

## Next Steps

- [Database Guide](./database.md) - Learn how to fetch data
- [Models Guide](./models.md) - Learn how to create model helpers
