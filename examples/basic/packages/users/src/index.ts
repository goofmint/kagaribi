import { Hono } from 'hono';
import { html, raw } from 'hono/html';

// サンプルデータ
const users = [
  { id: '1', name: 'Alice', bio: 'Backend engineer' },
  { id: '2', name: 'Bob', bio: 'Frontend developer' },
  { id: '3', name: 'Charlie', bio: 'DevOps specialist' },
];

const app = new Hono()
  // API
  .get('/api/users', (c) => {
    return c.json({ users });
  })
  .get('/api/users/:id', (c) => {
    const id = c.req.param('id');
    const user = users.find((u) => u.id === id);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json(user);
  })
  // UI: WebComponent - ユーザー一覧
  .get('/view/list', (c) => {
    const userItems = raw(
      users
        .map(
          (u) => `<li><a href="/users/view/profile/${u.id}">${u.name}</a> - ${u.bio}</li>`
        )
        .join('')
    );

    return c.html(html`
      <kagaribi-user-list>
        <template shadowrootmode="open">
          <style>
            :host { display: block; max-width: 600px; margin: 2rem auto; }
            ul { list-style: none; padding: 0; }
            li { padding: 0.75rem; border-bottom: 1px solid #eee; }
            a { color: #0066cc; text-decoration: none; }
          </style>
          <h2>Users</h2>
          <ul>${userItems}</ul>
        </template>
      </kagaribi-user-list>
      <script>
        if (!customElements.get('kagaribi-user-list')) {
          customElements.define('kagaribi-user-list', class extends HTMLElement {});
        }
      </script>
    `);
  })
  // UI: WebComponent - ユーザープロフィール
  .get('/view/profile/:id', (c) => {
    const id = c.req.param('id');
    const user = users.find((u) => u.id === id);
    if (!user) {
      return c.text('User not found', 404);
    }

    return c.html(html`
      <kagaribi-user-profile>
        <template shadowrootmode="open">
          <style>
            :host { display: block; max-width: 400px; margin: 2rem auto; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; }
            h2 { margin-top: 0; }
          </style>
          <div class="card">
            <h2>${user.name}</h2>
            <p>${user.bio}</p>
            <p><a href="/users/view/list">Back to list</a></p>
          </div>
        </template>
      </kagaribi-user-profile>
      <script>
        if (!customElements.get('kagaribi-user-profile')) {
          customElements.define('kagaribi-user-profile', class extends HTMLElement {});
        }
      </script>
    `);
  });

export type UsersApp = typeof app;
export default app;
