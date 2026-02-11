import type { FC } from 'hono/jsx';
import type { Article } from './ArticleList.js';

interface ArticleDetailProps {
  article: Article;
}

/**
 * Article detail view component
 * Displays full article content
 */
export const ArticleDetail: FC<ArticleDetailProps> = ({ article }) => {
  return (
    <kagaribi-article-detail>
      <template shadowrootmode="open">
        <style>{`
          :host { display: block; max-width: 600px; margin: 2rem auto; }
          .article { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; }
          h2 { margin-top: 0; }
          .meta { color: #888; font-size: 0.85em; }
        `}</style>
        <div class="article">
          <h2>{article.title}</h2>
          <p class="meta">by user {article.userId}</p>
          <p>{article.body}</p>
          <p><a href={`/users/${article.userId}/articles`}>Back to articles</a></p>
        </div>
      </template>
      <script>{`
        if (!customElements.get('kagaribi-article-detail')) {
          customElements.define('kagaribi-article-detail', class extends HTMLElement {});
        }
      `}</script>
    </kagaribi-article-detail>
  );
};
