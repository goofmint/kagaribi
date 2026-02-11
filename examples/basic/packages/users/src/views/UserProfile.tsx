import type { FC } from 'hono/jsx';
import { Layout } from './Layout.js';
import type { User } from './UserList.js';

interface UserProfileProps {
  user: User;
}

/**
 * User profile view component
 * Displays individual user details
 */
export const UserProfile: FC<UserProfileProps> = ({ user }) => {
  return (
    <Layout title={`${user.name} - Profile`}>
      <h1>User Profile</h1>

      <kagaribi-user-profile>
        <template shadowrootmode="open">
          <style>{`
            :host {
              display: block;
              margin: 2rem 0;
            }
            .profile-card {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 2rem;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h2 {
              margin: 0 0 1rem 0;
              font-size: 2em;
            }
            .bio {
              font-size: 1.2em;
              opacity: 0.9;
              margin-bottom: 1.5rem;
            }
            .user-id {
              font-size: 0.9em;
              opacity: 0.7;
            }
            .actions {
              margin-top: 2rem;
              padding-top: 1rem;
              border-top: 1px solid rgba(255,255,255,0.3);
            }
            a {
              color: white;
              text-decoration: none;
              padding: 0.5rem 1rem;
              background: rgba(255,255,255,0.2);
              border-radius: 4px;
              display: inline-block;
              transition: background 0.2s;
            }
            a:hover {
              background: rgba(255,255,255,0.3);
            }
          `}</style>
          <div class="profile-card">
            <h2>{user.name}</h2>
            <div class="bio">{user.bio}</div>
            <div class="user-id">User ID: {user.id}</div>
            <div class="actions">
              <a href="/users/view/list">← Back to User List</a>
            </div>
          </div>
        </template>
        <script>{`
          if (!customElements.get('kagaribi-user-profile')) {
            customElements.define('kagaribi-user-profile', class extends HTMLElement {});
          }
        `}</script>
      </kagaribi-user-profile>
    </Layout>
  );
};
