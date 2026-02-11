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
        <form id="login-form" method="POST">
          <input type="text" name="username" placeholder="Username" required />
          <input type="password" name="password" placeholder="Password" required />
          <button type="submit">Login</button>
        </form>
        <p style="margin-top: 1rem; font-size: 0.9em; color: #666;">
          Demo credentials: admin / password
        </p>
        <div id="message" style="margin-top: 1rem; padding: 0.5rem; border-radius: 4px; display: none;"></div>
      </template>
      <script>{`
        if (!customElements.get('kagaribi-login')) {
          customElements.define('kagaribi-login', class extends HTMLElement {
            connectedCallback() {
              const form = this.shadowRoot.querySelector('#login-form');
              const messageEl = this.shadowRoot.querySelector('#message');

              form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(form);
                const username = formData.get('username');
                const password = formData.get('password');

                try {
                  const response = await fetch('/auth/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                  });

                  const data = await response.json();

                  if (response.ok) {
                    messageEl.textContent = 'Login successful! Token: ' + data.token;
                    messageEl.style.display = 'block';
                    messageEl.style.background = '#d4edda';
                    messageEl.style.color = '#155724';
                    form.reset();
                  } else {
                    messageEl.textContent = 'Error: ' + (data.error || 'Login failed');
                    messageEl.style.display = 'block';
                    messageEl.style.background = '#f8d7da';
                    messageEl.style.color = '#721c24';
                  }
                } catch (error) {
                  messageEl.textContent = 'Network error: ' + error.message;
                  messageEl.style.display = 'block';
                  messageEl.style.background = '#f8d7da';
                  messageEl.style.color = '#721c24';
                }
              });
            }
          });
        }
      `}</script>
    </kagaribi-login>
  );
};
