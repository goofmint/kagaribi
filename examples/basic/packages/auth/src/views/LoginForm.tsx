import type { FC } from 'hono/jsx';

/**
 * Login form view component
 * Demonstrates WebComponent pattern for form UI
 */
export const LoginForm: FC = () => {
  return (
    <kagaribi-login>
      <template shadowrootmode="open">
        <style>{`
          :host { display: block; max-width: 400px; margin: 2rem auto; }
          form { display: flex; flex-direction: column; gap: 1rem; }
          input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
          button { padding: 0.5rem 1rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0052a3; }
        `}</style>
        <h2>Login</h2>
        <form>
          <input type="text" name="username" placeholder="Username" required />
          <input type="password" name="password" placeholder="Password" required />
          <button type="submit">Login</button>
        </form>
        <p style="margin-top: 1rem; font-size: 0.9em; color: #666;">
          Demo credentials: admin / password
        </p>
      </template>
      <script>{`
        if (!customElements.get('kagaribi-login')) {
          customElements.define('kagaribi-login', class extends HTMLElement {});
        }
      `}</script>
    </kagaribi-login>
  );
};
