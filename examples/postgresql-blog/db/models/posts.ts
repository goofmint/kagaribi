import { eq } from 'drizzle-orm';
import { getDb } from '../index.js';
import { posts } from '../schema.js';

/**
 * Posts model helper.
 * Provides type-safe CRUD operations for the posts table.
 */

/**
 * Find all posts records.
 */
export async function findAll() {
  const db = getDb();
  return await db.select().from(posts);
}

/**
 * Find a posts record by ID.
 */
export async function findById(id: number) {
  const db = getDb();
  const [record] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id));
  return record ?? null;
}


/**
 * Create a new posts record.
 */
export async function create(
  data: Pick<typeof posts.$inferInsert, 'title' | 'content'>
) {
  const db = getDb();
  const [created] = await db
    .insert(posts)
    .values(data)
    .returning();
  return created;
}

/**
 * Update a posts record by ID.
 */
export async function update(
  id: number,
  data: Partial<Pick<typeof posts.$inferInsert, 'title' | 'content'>>
) {
  const db = getDb();
  const [updated] = await db
    .update(posts)
    .set(data)
    .where(eq(posts.id, id))
    .returning();
  return updated ?? null;
}

/**
 * Remove a posts record by ID.
 */
export async function remove(id: number) {
  const db = getDb();
  const [deleted] = await db
    .delete(posts)
    .where(eq(posts.id, id))
    .returning();
  return deleted ?? null;
}
