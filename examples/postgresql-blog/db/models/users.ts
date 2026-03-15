import { ModelBase } from '@kagaribi/core';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';

/**
 * Users model helper.
 * Provides type-safe CRUD operations for the users table.
 */
export class Users extends ModelBase {
  /**
   * Find all users records.
   */
  static async findAll() {
    return this.getDb().select().from(users);
  }

  /**
   * Find a users record by ID.
   */
  static async findById(id: number) {
    const [record] = await this.getDb()
      .select()
      .from(users)
      .where(eq(users.id, id));
    return record ?? null;
  }

  /**
   * Create a new users record.
   */
  static async create(data: {
    name: string;
    email: string;
    age: number;
    is_active: boolean;
  }) {
    const [created] = await this.getDb()
      .insert(users)
      .values(data)
      .returning();
    return created;
  }

  /**
   * Update a users record by ID.
   */
  static async update(
    id: number,
    data: {
      name?: string;
      email?: string;
      age?: number;
      is_active?: boolean;
    }
  ) {
    const [updated] = await this.getDb()
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated ?? null;
  }

  /**
   * Remove a users record by ID.
   */
  static async remove(id: number) {
    const [deleted] = await this.getDb()
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return deleted ?? null;
  }
}
