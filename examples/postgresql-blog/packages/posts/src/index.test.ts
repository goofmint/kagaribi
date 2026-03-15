import { describe, it, expect } from 'vitest';
import app from './index';

describe('Posts API', () => {
  let createdPostId: number;

  it('GET / - should return all posts', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const posts = await res.json();
    expect(Array.isArray(posts)).toBe(true);
  });

  it('POST / - should create a new post', async () => {
    const res = await app.request('/', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Post',
        content: 'This is a test post content',
      }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    expect(res.status).toBe(201);
    const post = await res.json();
    expect(post).toHaveProperty('id');
    expect(post.title).toBe('Test Post');
    expect(post.content).toBe('This is a test post content');

    createdPostId = post.id;
  });

  it('POST / - should create a post without content', async () => {
    const res = await app.request('/', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Post Without Content',
      }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    expect(res.status).toBe(201);
    const post = await res.json();
    expect(post.title).toBe('Post Without Content');
    expect(post.content).toBeNull();
  });

  it('GET /:id - should return a specific post', async () => {
    const res = await app.request(`/${createdPostId}`);
    expect(res.status).toBe(200);
    const post = await res.json();
    expect(post.id).toBe(createdPostId);
    expect(post.title).toBe('Test Post');
  });

  it('GET /:id - should return 404 for non-existent post', async () => {
    const res = await app.request('/99999');
    expect(res.status).toBe(404);
    const error = await res.json();
    expect(error).toHaveProperty('error');
  });

  it('DELETE /:id - should delete a post', async () => {
    const res = await app.request(`/${createdPostId}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result).toHaveProperty('message');

    // Verify deletion
    const getRes = await app.request(`/${createdPostId}`);
    expect(getRes.status).toBe(404);
  });

  it('DELETE /:id - should return 404 for non-existent post', async () => {
    const res = await app.request('/99999', {
      method: 'DELETE',
    });

    expect(res.status).toBe(404);
  });
});
