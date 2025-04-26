import * as drizzleOrm from 'drizzle-orm';
import { getDb, NewReview, Review, reviews } from '@purrfect-sitter/database';

const { eq } = drizzleOrm;
export class ReviewRepository {
  async findById(id: string): Promise<Review | undefined> {
    const db = getDb();
    const result = await db.select().from(reviews).where(eq(reviews.id, id));
    return result[0];
  }

  async findByCatSittingId(catSittingId: string): Promise<Review | undefined> {
    const db = getDb();
    const result = await db
      .select()
      .from(reviews)
      .where(eq(reviews.catSittingId, catSittingId));
    return result[0];
  }

  async findAll(): Promise<Review[]> {
    const db = getDb();
    return db.select().from(reviews);
  }

  async create(review: NewReview): Promise<Review> {
    const db = getDb();
    const result = await db.insert(reviews).values(review).returning();
    return result[0];
  }

  async update(
    id: string,
    review: Partial<Omit<Review, 'id'>>
  ): Promise<Review | undefined> {
    const db = getDb();
    const result = await db
      .update(reviews)
      .set(review)
      .where(eq(reviews.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<Review | undefined> {
    const db = getDb();
    const result = await db
      .delete(reviews)
      .where(eq(reviews.id, id))
      .returning();
    return result[0];
  }
}

export const reviewRepository = new ReviewRepository();
