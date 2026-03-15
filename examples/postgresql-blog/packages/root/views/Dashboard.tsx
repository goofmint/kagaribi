import { FC } from 'hono/jsx';

interface Post {
  id: number;
  title: string;
  content: string | null;
  createdAt: string;
}

interface DashboardProps {
  posts: Post[];
  error?: string;
}

export const Dashboard: FC<DashboardProps> = ({ posts, error }) => {
  return (
    <html>
      <head>
        <title>Dashboard - Kagaribi PostgreSQL Blog</title>
        <style>{`
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
          }
          h1 {
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 0.5rem;
          }
          .info {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
          }
          .posts-list {
            list-style: none;
            padding: 0;
          }
          .post-item {
            background: white;
            border: 1px solid #ddd;
            padding: 1rem;
            margin: 0.5rem 0;
            border-radius: 4px;
          }
          .post-title {
            font-weight: bold;
            color: #007bff;
          }
          .post-content {
            color: #666;
            margin-top: 0.5rem;
          }
          a {
            color: #007bff;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .error {
            background: #fee;
            border: 1px solid #fcc;
            color: #c33;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
          }
        `}</style>
      </head>
      <body>
        <h1>Dashboard</h1>

        <div class="info">
          <p>
            This page is rendered by <strong>root</strong> package,
            fetching data from <strong>posts</strong> package via <code>getClient()</code>.
          </p>
          <p><a href="/">← Back to home</a></p>
        </div>

        {error && (
          <div class="error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <h2>All Posts ({posts.length} total)</h2>

        {posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          <ul class="posts-list">
            {posts.map((post) => (
              <li key={post.id} class="post-item">
                <div class="post-title">{post.title}</div>
                <div class="post-content">
                  {post.content || '(no content)'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </body>
    </html>
  );
};
