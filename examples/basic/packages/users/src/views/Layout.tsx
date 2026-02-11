import type { FC } from 'hono/jsx';

interface LayoutProps {
  title: string;
  children?: any;
}

/**
 * Basic HTML layout component
 * Provides simple page structure and styling
 */
export const Layout: FC<LayoutProps> = ({ title, children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          nav {
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #eee;
          }
          nav a {
            color: #0066cc;
            text-decoration: none;
            margin-right: 1rem;
          }
          nav a:hover {
            text-decoration: underline;
          }
        `}</style>
      </head>
      <body>
        <div class="container">
          <nav>
            <a href="/">← Home</a>
            <a href="/users/view/list">User List</a>
          </nav>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
};
