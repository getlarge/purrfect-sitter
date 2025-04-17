import { catSittingRepository } from '@purrfect-sitter/cat-sittings-repositories';
import {
  castReview,
  CreateReviewDto,
  UpdateReviewDto,
} from '@purrfect-sitter/models';
import type { OpenFgaApi, TupleKey } from '@openfga/sdk';
import { getOpenFgaClient } from '@purrfect-sitter/auth-repositories';
import { reviewRepository } from '@purrfect-sitter/reviews-repositories';

export class ReviewsService {
  private openfga: OpenFgaApi;
  private openfgaStoreId: string;

  constructor() {
    const { client, storeId } = getOpenFgaClient();
    this.openfga = client;
    this.openfgaStoreId = storeId;
  }

  async findAll() {
    const reviews = await reviewRepository.findAll();
    return reviews.map((review) => castReview(review));
  }

  async findById(id: string) {
    const review = await reviewRepository.findById(id);
    if (!review) {
      return null;
    }
    return castReview(review);
  }

  async findByCatSittingId(catSittingId: string) {
    const review = await reviewRepository.findByCatSittingId(catSittingId);
    if (!review) {
      return null;
    }
    return castReview(review);
  }

  async create(userId: string, createReviewDto: CreateReviewDto) {
    // Verify the cat sitting exists and is completed
    const catSitting = await catSittingRepository.findById(
      createReviewDto.catSittingId
    );
    if (!catSitting) {
      throw new Error('Cat sitting not found');
    }

    const existingReview = await reviewRepository.findByCatSittingId(
      createReviewDto.catSittingId
    );
    if (existingReview) {
      throw new Error('This cat sitting already has a review');
    }

    const newReview = await reviewRepository.create(createReviewDto);
    await this.createAuthRelationships(
      newReview.id,
      createReviewDto.catSittingId
    );

    return castReview(newReview);
  }

  async update(id: string, updateReviewDto: UpdateReviewDto) {
    const review = await reviewRepository.update(id, updateReviewDto);
    return castReview(review);
  }

  async remove(id: string) {
    const review = await reviewRepository.findById(id);
    if (!review) {
      return null;
    }

    const deletedReview = await reviewRepository.delete(id);
    if (deletedReview) {
      // Delete OpenFGA relationship tuples
      await this.deleteAuthRelationships(id, review.catSittingId);
    }

    return castReview(deletedReview);
  }

  // Helper to create OpenFGA relationship tuples for authorization
  private async createAuthRelationships(
    reviewId: string,
    catSittingId: string
  ) {
    const tuples: TupleKey[] = [
      {
        user: `cat_sitting:${catSittingId}`,
        relation: 'cat_sitting',
        object: `review:${reviewId}`,
      },
    ];

    try {
      await this.openfga.write(this.openfgaStoreId, {
        writes: {
          tuple_keys: tuples,
        },
      });
    } catch (error) {
      console.error('Failed to create authorization relationships:', error);
    }
  }

  // Helper to delete OpenFGA relationship tuples
  private async deleteAuthRelationships(
    reviewId: string,
    catSittingId: string
  ) {
    const tuples: TupleKey[] = [
      {
        user: `cat_sitting:${catSittingId}`,
        relation: 'cat_sitting',
        object: `review:${reviewId}`,
      },
    ];

    try {
      await this.openfga.write(this.openfgaStoreId, {
        deletes: {
          tuple_keys: tuples,
        },
      });
    } catch (error) {
      console.error('Failed to delete authorization relationships:', error);
    }
  }
}

// export const reviewsService = new ReviewsService();
