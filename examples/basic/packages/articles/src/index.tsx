import { Hono } from 'hono';
import { kagaribiParamsMiddleware } from '@kagaribi/core';
import { ArticleList } from './views/ArticleList.js';
import { ArticleDetail } from './views/ArticleDetail.js';
import type { Article } from './views/ArticleList.js';

// Sample data
const articles: Article[] = [
  { id: '1', userId: '1', title: 'Getting Started with Hono', body: 'Hono is a lightweight web framework...' },
  { id: '2', userId: '1', title: 'Microservices with kagaribi', body: 'kagaribi enables package-based microservices...' },
  { id: '3', userId: '2', title: 'WebComponents Guide', body: 'WebComponents provide encapsulated UI...' },
  { id: '4', userId: '2', title: 'Shadow DOM Deep Dive', body: 'Shadow DOM isolates styles and markup...' },
  { id: '5', userId: '3', title: 'DevOps Best Practices', body: 'CI/CD pipelines are essential...' },
];

const app = new Hono();

// Extract path parameters from X-Kagaribi-Params header for c.get() access
app.use('*', kagaribiParamsMiddleware());

const routes = app
  // API: Article list (filterable by userId)
  .get('/', (c) => {
    const userId = c.get('userId' as never) as string | undefined
      ?? c.req.query('userId');
    if (userId) {
      const filtered = articles.filter((a) => a.userId === userId);
      return c.json({ articles: filtered, userId });
    }
    return c.json({ articles });
  })

  // API: Article detail
  .get('/:id', (c) => {
    const id = c.req.param('id');

    // Guard against /view/* route prefix collision
    if (id === 'view') {
      return c.notFound();
    }

    const article = articles.find((a) => a.id === id);
    if (!article) {
      return c.json({ error: 'Article not found' }, 404);
    }
    return c.json(article);
  })

  // View: Article list
  // Route handler handles data filtering and view invocation only
  .get('/view/list', (c) => {
    const userId = c.get('userId' as never) as string | undefined
      ?? c.req.query('userId');
    const filtered = userId
      ? articles.filter((a) => a.userId === userId)
      : articles;

    return c.html(<ArticleList articles={filtered} userId={userId} />);
  })

  // View: Article detail
  // Request parsing, data retrieval, and view rendering
  .get('/view/:id', (c) => {
    const id = c.req.param('id');
    const article = articles.find((a) => a.id === id);
    if (!article) {
      return c.text('Article not found', 404);
    }

    return c.html(<ArticleDetail article={article} />);
  });

export type ArticlesApp = typeof routes;
export default routes;
