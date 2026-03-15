import { describe, it, expect } from 'vitest';
import app from './index';

describe('Users API', () => {
  let createdUserId: number;

  it('GET / - should return all users', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const users = await res.json();
    expect(Array.isArray(users)).toBe(true);
  });

  it('POST / - should create a new user', async () => {
    const res = await app.request('/', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        age: 25,
        is_active: true,
      }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    expect(res.status).toBe(201);
    const user = await res.json();
    expect(user).toHaveProperty('id');
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
    expect(user.age).toBe(25);
    expect(user.is_active).toBe(true);

    createdUserId = user.id;
  });

  it('GET /:id - should return a specific user', async () => {
    const res = await app.request(`/${createdUserId}`);
    expect(res.status).toBe(200);
    const user = await res.json();
    expect(user.id).toBe(createdUserId);
    expect(user.name).toBe('Test User');
  });

  it('GET /:id - should return 404 for non-existent user', async () => {
    const res = await app.request('/99999');
    expect(res.status).toBe(404);
    const error = await res.json();
    expect(error).toHaveProperty('error');
  });

  it('PUT /:id - should update a user', async () => {
    const res = await app.request(`/${createdUserId}`, {
      method: 'PUT',
      body: JSON.stringify({
        age: 26,
        is_active: false,
      }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    expect(res.status).toBe(200);
    const user = await res.json();
    expect(user.age).toBe(26);
    expect(user.is_active).toBe(false);
    expect(user.name).toBe('Test User'); // Should not change
  });

  it('PUT /:id - should return 404 for non-existent user', async () => {
    const res = await app.request('/99999', {
      method: 'PUT',
      body: JSON.stringify({ age: 30 }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    expect(res.status).toBe(404);
  });

  it('DELETE /:id - should delete a user', async () => {
    const res = await app.request(`/${createdUserId}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result).toHaveProperty('message');

    // Verify deletion
    const getRes = await app.request(`/${createdUserId}`);
    expect(getRes.status).toBe(404);
  });

  it('DELETE /:id - should return 404 for non-existent user', async () => {
    const res = await app.request('/99999', {
      method: 'DELETE',
    });

    expect(res.status).toBe(404);
  });
});
