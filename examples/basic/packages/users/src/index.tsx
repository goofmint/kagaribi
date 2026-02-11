import { Hono } from 'hono';
import { UserList } from './views/UserList.js';
import { UserProfile } from './views/UserProfile.js';
import type { User } from './views/UserList.js';

// Sample data
const users: User[] = [
  { id: '1', name: 'Alice', bio: 'Backend engineer' },
  { id: '2', name: 'Bob', bio: 'Frontend developer' },
  { id: '3', name: 'Charlie', bio: 'DevOps specialist' },
];

const app = new Hono();

app
  // API: Get user list
  .get('/api/users', (c) => {
    return c.json({ users });
  })

  // API: Get user details
  .get('/api/users/:id', (c) => {
    const id = c.req.param('id');
    const user = users.find((u) => u.id === id);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
  })

  // View: User list display
  // Route handler focuses only on data retrieval and view invocation
  .get('/view/list', (c) => {
    // Data retrieval (static data in this example)
    const userData = users;

    // Call view component and render
    return c.html(<UserList users={userData} />);
  })

  // View: User profile display
  // Request parsing, data validation, and view invocation only
  .get('/view/profile/:id', (c) => {
    // Get request parameters
    const id = c.req.param('id');

    // Data retrieval and validation
    const user = users.find((u) => u.id === id);
    if (!user) {
      return c.text('User not found', 404);
    }

    // Call view component and render
    return c.html(<UserProfile user={user} />);
  });

export type UsersApp = typeof app;
export default app;
