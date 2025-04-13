import { eq } from 'drizzle-orm';
import { getDb } from '../database.js';
import { NewUser, User, users } from '../schema/users.js';

export class UserRepository {
  async findById(id: string): Promise<User | undefined> {
    const db = getDb();
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async findByKratosSid(sid: string): Promise<User | undefined> {
    const db = getDb();
    const result = await db.select().from(users).where(eq(users.kratosSid, sid));
    return result[0];
  }

  async create(user: NewUser): Promise<User> {
    const db = getDb();
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async update(id: string, user: Partial<Omit<User, 'id'>>): Promise<User | undefined> {
    const db = getDb();
    const result = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return result[0];
  }

  async delete(id: string): Promise<User | undefined> {
    const db = getDb();
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result[0];
  }
}

export const userRepository = new UserRepository();