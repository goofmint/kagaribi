import { Hono } from 'hono';
import { html, raw } from 'hono/html';
import { kagaribiParamsMiddleware } from '@kagaribi/core';

// サンプルデータ
const articles = [
  { id: '1', userId: '1', title: 'Getting Started with Hono', body: 'Hono is a lightweight web framework...' },
  { id: '2', userId: '1', title: 'Microservices with kagaribi', body: 'kagaribi enables package-based microservices...' },
  { id: '3', userId: '2', title: 'WebComponents Guide', body: 'WebComponents provide encapsulated UI...' },
  { id: '4', userId: '2', title: 'Shadow DOM Deep Dive', body: 'Shadow DOM isolates styles and markup...' },
  { id: '5', userId: '3', title: 'DevOps Best Practices', body: 'CI/CD pipelines are essential...' },
];

const app = new Hono();

// X-Kagaribi-Params ヘッダーからパスパラメータを c.get() で取得可能にする
app.use('*', kagaribiParamsMiddleware());

const routes = app
  // API: 記事一覧（userId でフィルタリング可能）
  .get('/', (c) => {
    const userId = c.get('userId' as never) as string | undefined
      ?? c.req.query('userId');
    if (userId) {
      const filtered = articles.filter((a) => a.userId === userId);
      return c.json({ articles: filtered, userId });
    }
    return c.json({ articles });
  })
  // API: 記事詳細
  .get('/:id', (c) => {
    const id = c.req.param('id');

    // /view/* ルートのプレフィクスと衝突しないようガード
    if (id === 'view') {
      return c.notFound();
    }

    const article = articles.find((a) => a.id === id);
    if (!article) {
      return c.json({ error: 'Article not found' }, 404);
    }
    return c.json(article);
  })
  // UI: 記事一覧 WebComponent
  .get('/view/list', (c) => {
    const userId = c.get('userId' as never) as string | undefined
      ?? c.req.query('userId');
    const filtered = userId
      ? articles.filter((a) => a.userId === userId)
      : articles;

    const articleItems = raw(
      filtered
        .map(
          (a) =>
            `<li><a href="/users/${a.userId}/articles/${a.id}">${a.title}</a><span class="meta"> by user ${a.userId}</span></li>`
        )
        .join('')
    );

    return c.html(html`
      <kagaribi-article-list>
        <template shadowrootmode="open">
          <style>
            :host { display: block; max-width: 600px; margin: 2rem auto; }
            ul { list-style: none; padding: 0; }
            li { padding: 0.75rem; border-bottom: 1px solid #eee; }
            a { color: #0066cc; text-decoration: none; }
            .meta { color: #888; font-size: 0.85em; }
          </style>
          <h2>${userId ? `Articles by User ${userId}` : 'All Articles'}</h2>
          <ul>${articleItems}</ul>
        </template>
      </kagaribi-article-list>
      <script>
        if (!customElements.get('kagaribi-article-list')) {
          customElements.define('kagaribi-article-list', class extends HTMLElement {});
        }
      </script>
    `);
  })
  // UI: 記事詳細 WebComponent
  .get('/view/:id', (c) => {
    const id = c.req.param('id');
    const article = articles.find((a) => a.id === id);
    if (!article) {
      return c.text('Article not found', 404);
    }

    return c.html(html`
      <kagaribi-article-detail>
        <template shadowrootmode="open">
          <style>
            :host { display: block; max-width: 600px; margin: 2rem auto; }
            .article { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; }
            h2 { margin-top: 0; }
            .meta { color: #888; font-size: 0.85em; }
          </style>
          <div class="article">
            <h2>${article.title}</h2>
            <p class="meta">by user ${article.userId}</p>
            <p>${article.body}</p>
            <p><a href="/users/${article.userId}/articles">Back to articles</a></p>
          </div>
        </template>
      </kagaribi-article-detail>
      <script>
        if (!customElements.get('kagaribi-article-detail')) {
          customElements.define('kagaribi-article-detail', class extends HTMLElement {});
        }
      </script>
    `);
  });

export type ArticlesApp = typeof routes;
export default app;
