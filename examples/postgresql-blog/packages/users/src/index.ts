import { Hono } from 'hono';
import { createDb, createDbMiddleware } from '@kagaribi/core';
import * as schema from '../../../db/schema.js';
import { Users } from '../../../db/models/users.js';

const { initDb } = createDb('postgresql', schema);

const app = new Hono()
  .use('*', createDbMiddleware({ initFn: initDb }))
  // Get all users
  .get('/', async (c) => {
    const allUsers = await Users.findAll();
    return c.json(allUsers);
  })
  // Get user by ID
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const user = await Users.findById(id);
    if (!user) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json(user);
  })
  // Create user
  .post('/', async (c) => {
    const body = await c.req.json<{
      name: string;
      email: string;
      age: number;
      is_active: boolean;
    }>();
    const created = await Users.create({
      name: body.name,
      email: body.email,
      age: body.age,
      is_active: body.is_active,
    });
    return c.json(created, 201);
  })
  // Update user
  .put('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const body = await c.req.json<{
      name?: string;
      email?: string;
      age?: number;
      is_active?: boolean;
    }>();
    const updated = await Users.update(id, body);
    if (!updated) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json(updated);
  })
  // Delete user
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const deleted = await Users.remove(id);
    if (!deleted) {
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json({ message: 'Deleted' });
  });

export type UsersApp = typeof app;
export default app;

