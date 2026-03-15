import { getGlobalDb } from './db-factory.js';

/**
 * Base class for model helpers.
 *
 * Provides access to the global database instance through `getDb()`.
 * Model classes should extend this class and use static methods.
 *
 * @example
 * ```typescript
 * import { ModelBase } from '@kagaribi/core';
 * import { posts } from '../schema.js';
 * import { eq } from 'drizzle-orm';
 *
 * export class Posts extends ModelBase {
 *   static async findAll() {
 *     return this.getDb().select().from(posts);
 *   }
 *
 *   static async findById(id: number) {
 *     const [record] = await this.getDb().select().from(posts).where(eq(posts.id, id));
 *     return record ?? null;
 *   }
 * }
 * ```
 */
export class ModelBase {
  /**
   * Get the database instance from the global context.
   *
   * @throws Error if global database is not initialized
   */
  protected static getDb<T = unknown>(): T {
    const { getDb } = getGlobalDb<T>();
    return getDb();
  }
}
