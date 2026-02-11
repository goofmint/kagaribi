import type { FC } from 'hono/jsx';
import { Layout } from './Layout.js';

export interface User {
  id: string;
  name: string;
  bio: string;
}

interface UserListProps {
  users: User[];
}

/**
 * User list view component
 * Uses WebComponent pattern to isolate styles
 */
export const UserList: FC<UserListProps> = ({ users }) => {
  return (
    <Layout title="User List - Users Package">
      <h1>User List</h1>
      <p>Total {users.length} users</p>

      <kagaribi-user-list>
        <template shadowrootmode="open">
          <style>{`
            :host {
              display: block;
              margin: 2rem 0;
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
              border-left: 4px solid #0066cc;
              transition: transform 0.2s;
            }
            li:hover {
              transform: translateX(4px);
              background: #f0f0f0;
            }
            a {
              color: #0066cc;
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
          if (!customElements.get('kagaribi-user-list')) {
            customElements.define('kagaribi-user-list', class extends HTMLElement {});
          }
        `}</script>
      </kagaribi-user-list>
    </Layout>
  );
};
