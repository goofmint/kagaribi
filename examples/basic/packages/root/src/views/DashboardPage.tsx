import type { FC } from 'hono/jsx';

interface DashboardPageProps {
  userListHtml: string;
}

/**
 * Dashboard page view component
 * Embeds HTML content from other packages
 */
export const DashboardPage: FC<DashboardPageProps> = ({ userListHtml }) => {
  return (
    <div>
      <h1>Dashboard</h1>
      <p style="color: #666; margin-bottom: 2rem;">
        This page is rendered by the <strong>root</strong> package,
        embedding UI from the <strong>users</strong> package.
      </p>

      <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h2 style="color: #667eea; margin-bottom: 1rem;">💡 Cross-Package Integration Demo</h2>
        <p style="margin-bottom: 1rem;">
          Using{' '}
          <code style="background: #e9ecef; padding: 0.25rem 0.5rem; border-radius: 4px;">
            getClient&lt;UsersApp&gt;('users')
          </code>
          {' '}to fetch UI from another package.
        </p>
        <p style="color: #666; font-size: 0.9em;">
          This enables microservices-like architecture while maintaining seamless UI integration.
        </p>
      </div>

      <section>
        <h2 style="color: #667eea; margin-bottom: 1rem;">
          👥 User List (from users package)
        </h2>
        <div dangerouslySetInnerHTML={{ __html: userListHtml }}></div>
      </section>

      <p style="margin-top: 2rem; text-align: center;">
        <a href="/" style="color: #667eea; text-decoration: none; font-weight: bold;">
          ← Back to Home
        </a>
      </p>
    </div>
  );
};
