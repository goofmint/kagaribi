import type { FC } from 'hono/jsx';

interface LayoutProps {
  title?: string;
  children?: any;
}

/**
 * Root package shared layout component
 * Used in combination with jsxRenderer middleware
 */
export const RootLayout: FC<LayoutProps> = ({ title = 'Kagaribi Example', children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
          }
          .main-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            overflow: hidden;
          }
          header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
          }
          header h1 {
            font-size: 2.5em;
            margin-bottom: 0.5rem;
          }
          header p {
            font-size: 1.2em;
            opacity: 0.9;
          }
          nav {
            background: #f8f9fa;
            padding: 1rem 2rem;
            border-bottom: 2px solid #e9ecef;
          }
          nav a {
            color: #495057;
            text-decoration: none;
            margin-right: 1.5rem;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            transition: all 0.2s;
            display: inline-block;
          }
          nav a:hover {
            background: #667eea;
            color: white;
          }
          main {
            padding: 2rem;
          }
          footer {
            background: #f8f9fa;
            padding: 1.5rem 2rem;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
          }
        `}</style>
      </head>
      <body>
        <div class="main-container">
          <header>
            <h1>🔥 Kagaribi</h1>
            <p>Basic Example - External JSX Templates</p>
          </header>
          <nav>
            <a href="/">Home</a>
            <a href="/auth/login">Auth</a>
            <a href="/users/view/list">Users</a>
            <a href="/dashboard">Dashboard</a>
          </nav>
          <main>{children}</main>
          <footer>
            <p>Powered by Kagaribi & Hono JSX</p>
          </footer>
        </div>
      </body>
    </html>
  );
};
