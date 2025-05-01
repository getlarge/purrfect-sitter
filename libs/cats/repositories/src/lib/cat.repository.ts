import * as drizzle from 'drizzle-orm';
import { getDb, Cat, NewCat, cats } from '@purrfect-sitter/database';

const { eq } = drizzle.getOperators();

export class CatRepository {
  async findById(id: string): Promise<Cat | undefined> {
    const db = getDb();
    const result = await db.select().from(cats).where(eq(cats.id, id));
    return result[0];
  }

  async findByOwnerId(ownerId: string): Promise<Cat[]> {
    const db = getDb();
    return db.select().from(cats).where(eq(cats.ownerId, ownerId));
  }

  async findAll(): Promise<Cat[]> {
    const db = getDb();
    return db.select().from(cats);
  }

  async create(cat: NewCat): Promise<Cat> {
    const db = getDb();
    const result = await db.insert(cats).values(cat).returning();
    return result[0];
  }

  async update(
    id: string,
    cat: Partial<Omit<Cat, 'id'>>
  ): Promise<Cat | undefined> {
    const db = getDb();
    const result = await db
      .update(cats)
      .set(cat)
      .where(eq(cats.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<Cat | undefined> {
    const db = getDb();
    const result = await db.delete(cats).where(eq(cats.id, id)).returning();
    return result[0];
  }
}

export const catRepository = new CatRepository();
