import { catSittingRepository } from '@purrfect-sitter/cat-sittings-repositories';
import { CatSittingStatus } from '@purrfect-sitter/database';
import { CreateReviewDto, UpdateReviewDto } from '@purrfect-sitter/models';
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
    return reviewRepository.findAll();
  }

  async findById(id: string) {
    return reviewRepository.findById(id);
  }

  async findByCatSittingId(catSittingId: string) {
    return reviewRepository.findByCatSittingId(catSittingId);
  }

  async create(userId: string, createReviewDto: CreateReviewDto) {
    // Verify the cat sitting exists and is completed
    const catSitting = await catSittingRepository.findById(
      createReviewDto.catSittingId
    );
    if (!catSitting) {
      throw new Error('Cat sitting not found');
    }

    // Verify the cat sitting is completed
    if (catSitting.status !== CatSittingStatus.COMPLETED) {
      throw new Error('Cannot review an incomplete cat sitting');
    }

    // Verify this sitting doesn't already have a review
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

    return newReview;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto) {
    return reviewRepository.update(id, updateReviewDto);
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

    return deletedReview;
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

export const reviewsService = new ReviewsService();
