import { ModelBase } from '@kagaribi/core';
import { eq } from 'drizzle-orm';
import { posts } from '../schema.js';

/**
 * Posts model helper.
 * Provides type-safe CRUD operations for the posts table.
 */
export class Posts extends ModelBase {
  /**
   * Find all posts records.
   */
  static async findAll() {
    return this.getDb().select().from(posts);
  }

  /**
   * Find a posts record by ID.
   */
  static async findById(id: number) {
    const [record] = await this.getDb()
      .select()
      .from(posts)
      .where(eq(posts.id, id));
    return record ?? null;
  }

  /**
   * Create a new posts record.
   */
  static async create(data: { title: string; content?: string | null }) {
    const [created] = await this.getDb()
      .insert(posts)
      .values(data)
      .returning();
    return created;
  }

  /**
   * Update a posts record by ID.
   */
  static async update(
    id: number,
    data: { title?: string; content?: string | null }
  ) {
    const [updated] = await this.getDb()
      .update(posts)
      .set(data)
      .where(eq(posts.id, id))
      .returning();
    return updated ?? null;
  }

  /**
   * Remove a posts record by ID.
   */
  static async remove(id: number) {
    const [deleted] = await this.getDb()
      .delete(posts)
      .where(eq(posts.id, id))
      .returning();
    return deleted ?? null;
  }
}
