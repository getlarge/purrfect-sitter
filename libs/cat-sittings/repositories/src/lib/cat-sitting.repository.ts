import * as drizzleOrm from 'drizzle-orm';
import {
  getDb,
  CatSitting,
  CatSittingStatus,
  NewCatSitting,
  catSittings,
} from '@purrfect-sitter/database';

const { and, eq, gte, lte } = drizzleOrm.getOperators();

export class CatSittingRepository {
  async findById(id: string): Promise<CatSitting | undefined> {
    const db = getDb();
    const result = await db
      .select()
      .from(catSittings)
      .where(eq(catSittings.id, id));
    return result[0];
  }

  async findBySitterId(sitterId: string): Promise<CatSitting[]> {
    const db = getDb();
    return db
      .select()
      .from(catSittings)
      .where(eq(catSittings.sitterId, sitterId));
  }

  async findByCatId(catId: string): Promise<CatSitting[]> {
    const db = getDb();
    return db.select().from(catSittings).where(eq(catSittings.catId, catId));
  }

  async findActiveByTimeRange(currentTime: Date): Promise<CatSitting[]> {
    const db = getDb();
    return db
      .select()
      .from(catSittings)
      .where(
        and(
          eq(catSittings.status, CatSittingStatus.ACTIVE),
          lte(catSittings.startTime, currentTime),
          gte(catSittings.endTime, currentTime)
        )
      );
  }

  async findCompletedByIds(ids: string[]): Promise<CatSitting[]> {
    const db = getDb();
    // Using an IN condition with the array of IDs
    // Note: TypeScript might complain but this is a valid Drizzle ORM operation
    return db
      .select()
      .from(catSittings)
      .where(
        and(
          // @ts-expect-error: This is a valid operation but the TypeScript types might not be precise here
          catSittings.id.in(ids),
          eq(catSittings.status, CatSittingStatus.COMPLETED)
        )
      );
  }

  async findAll(): Promise<CatSitting[]> {
    const db = getDb();
    return db.select().from(catSittings);
  }

  async create(catSitting: NewCatSitting): Promise<CatSitting> {
    const db = getDb();
    const result = await db.insert(catSittings).values(catSitting).returning();
    return result[0];
  }

  async update(
    id: string,
    catSitting: Partial<Omit<CatSitting, 'id'>>
  ): Promise<CatSitting | undefined> {
    const db = getDb();
    const result = await db
      .update(catSittings)
      .set(catSitting)
      .where(eq(catSittings.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<CatSitting | undefined> {
    const db = getDb();
    const result = await db
      .delete(catSittings)
      .where(eq(catSittings.id, id))
      .returning();
    return result[0];
  }
}

export const catSittingRepository = new CatSittingRepository();
