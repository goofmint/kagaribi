import type { FC } from 'hono/jsx';

interface User {
  id: string;
  name: string;
  bio: string;
}

interface DashboardPageProps {
  users: User[];
}

/**
 * Dashboard page view component
 * Displays data fetched from other packages via JSON API
 */
export const DashboardPage: FC<DashboardPageProps> = ({ users }) => {
  return (
    <div>
      <h1>Dashboard</h1>
      <p style="color: #666; margin-bottom: 2rem;">
        This page is rendered by the <strong>root</strong> package,
        displaying data from the <strong>users</strong> package.
      </p>

      <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h2 style="color: #667eea; margin-bottom: 1rem;">💡 Cross-Package Integration Demo</h2>
        <p style="margin-bottom: 1rem;">
          Using{' '}
          <code style="background: #e9ecef; padding: 0.25rem 0.5rem; border-radius: 4px;">
            getClient&lt;UsersApp&gt;('users').api.users
          </code>
          {' '}to fetch JSON data from another package.
        </p>
        <p style="color: #666; font-size: 0.9em;">
          This enables microservices-like architecture while maintaining clean data integration.
        </p>
      </div>

      <section>
        <h2 style="color: #667eea; margin-bottom: 1rem;">
          👥 User List (from users package)
        </h2>
        <p style="color: #666; margin-bottom: 1rem;">Total {users.length} users</p>
        <kagaribi-dashboard-userlist>
          <template shadowrootmode="open">
            <style>{`
              :host {
                display: block;
                margin: 1rem 0;
              }
              ul {
                list-style: none;
                padding: 0;
                margin: 0;
              }
              li {
                padding: 1rem;
                margin-bottom: 0.5rem;
                background: #f9f9f9;
                border-radius: 4px;
                border-left: 4px solid #667eea;
                transition: transform 0.2s;
              }
              li:hover {
                transform: translateX(4px);
                background: #f0f0f0;
              }
              a {
                color: #667eea;
                text-decoration: none;
                font-weight: bold;
                font-size: 1.1em;
              }
              a:hover {
                text-decoration: underline;
              }
              .bio {
                color: #666;
                font-size: 0.9em;
                margin-top: 0.25rem;
              }
            `}</style>
            <ul>
              {users.map((user) => (
                <li key={user.id}>
                  <a href={`/users/view/profile/${user.id}`}>{user.name}</a>
                  <div class="bio">{user.bio}</div>
                </li>
              ))}
            </ul>
          </template>
          <script>{`
            if (!customElements.get('kagaribi-dashboard-userlist')) {
              customElements.define('kagaribi-dashboard-userlist', class extends HTMLElement {});
            }
          `}</script>
        </kagaribi-dashboard-userlist>
      </section>

      <p style="margin-top: 2rem; text-align: center;">
        <a href="/" style="color: #667eea; text-decoration: none; font-weight: bold;">
          ← Back to Home
        </a>
      </p>
    </div>
  );
};
