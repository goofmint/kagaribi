import type { FC } from 'hono/jsx';

export interface Article {
  id: string;
  userId: string;
  title: string;
  body: string;
}

interface ArticleListProps {
  articles: Article[];
  userId?: string;
}

/**
 * Article list view component
 * Displays articles with optional user filter
 */
export const ArticleList: FC<ArticleListProps> = ({ articles, userId }) => {
  return (
    <kagaribi-article-list>
      <template shadowrootmode="open">
        <style>{`
          :host { display: block; max-width: 600px; margin: 2rem auto; }
          ul { list-style: none; padding: 0; }
          li { padding: 0.75rem; border-bottom: 1px solid #eee; }
          a { color: #0066cc; text-decoration: none; }
          .meta { color: #888; font-size: 0.85em; }
        `}</style>
        <h2>{userId ? `Articles by User ${userId}` : 'All Articles'}</h2>
        <ul>
          {articles.map((a) => (
            <li key={a.id}>
              <a href={`/users/${a.userId}/articles/${a.id}`}>{a.title}</a>
              <span class="meta"> by user {a.userId}</span>
            </li>
          ))}
        </ul>
      </template>
      <script>{`
        if (!customElements.get('kagaribi-article-list')) {
          customElements.define('kagaribi-article-list', class extends HTMLElement {});
        }
      `}</script>
    </kagaribi-article-list>
  );
};
