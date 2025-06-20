import { CatSittingStatus } from '@purrfect-sitter/database';
import {
  CatDto,
  CatSittingDto,
  CreateCatDto,
  CreateCatResponseSchema,
  CreateCatSittingDto,
  CreateCatSittingResponseSchema,
  CreateReviewDto,
  CreateReviewResponseSchema,
  DeleteReviewResponseSchema,
  GetReviewResponseSchema,
  ReviewDto,
  UpdateCatSittingStatusDto,
  UpdateReviewDto,
  UpdateReviewResponseSchema,
} from '@purrfect-sitter/models';
import {
  createTestUser,
  createAuthenticatedClient,
  TestUser,
  createAdmin,
} from '../../support/test-utils.js';
import { AxiosInstance } from 'axios';
import { randomBytes } from 'node:crypto';

const AUTH_STRATEGY = process.env.AUTH_STRATEGY;

describe(`Review Resource Authorization Tests [${AUTH_STRATEGY}]`, () => {
  let catOwner: TestUser;
  let catSitter: TestUser;
  let admin: TestUser;

  let ownerClient: AxiosInstance;
  let sitterClient: AxiosInstance;
  let adminClient: AxiosInstance;

  let cat: CatDto;
  let catSitting: CatSittingDto;
  let review: ReviewDto;

  beforeAll(async () => {
    catOwner = await createTestUser(
      `cat_owner_${randomBytes(4).toString('hex')}@test.com`,
      randomBytes(8).toString('hex'),
      'cat_owner'
    );
    catSitter = await createTestUser(
      `cat_sitter_${randomBytes(4).toString('hex')}@test.com`,
      randomBytes(8).toString('hex'),
      'cat_sitter'
    );
    admin = await createTestUser(
      `admin_${randomBytes(4).toString('hex')}@test.com`,
      randomBytes(8).toString('hex'),
      'admin'
    );
    await createAdmin(admin.id);

    ownerClient = createAuthenticatedClient(catOwner.sessionToken);
    sitterClient = createAuthenticatedClient(catSitter.sessionToken);
    adminClient = createAuthenticatedClient(admin.sessionToken);

    const catResponse = await ownerClient.post<CreateCatResponseSchema>(
      '/cats',
      {
        name: 'Whiskers',
        description: 'A fluffy test cat',
        breed: 'Test Breed',
        age: '3',
      } satisfies CreateCatDto
    );
    expect(catResponse.status).toBe(201);
    cat = catResponse.data.data;

    const sittingResponse =
      await ownerClient.post<CreateCatSittingResponseSchema>('/cat-sittings', {
        catId: cat.id,
        sitterId: catSitter.id,
        startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      } satisfies CreateCatSittingDto);
    expect(sittingResponse.status).toBe(201);

    const updatedSittingResponse =
      await ownerClient.put<CreateCatSittingResponseSchema>(
        `/cat-sittings/${sittingResponse.data.data.id}/status`,
        {
          status: CatSittingStatus.COMPLETED,
        } satisfies UpdateCatSittingStatusDto
      );
    expect(updatedSittingResponse.status).toBe(200);
    catSitting = updatedSittingResponse.data.data;

    const reviewResponse = await ownerClient.post<CreateReviewResponseSchema>(
      '/reviews',
      {
        catSittingId: catSitting.id,
        rating: 5,
        content: 'Excellent service!',
      } satisfies CreateReviewDto
    );
    expect(reviewResponse.status).toBe(201);
    review = reviewResponse.data.data;
  });

  describe('Cat Owner', () => {
    it('can create a review for a completed sitting', async () => {
      const newSittingResponse =
        await ownerClient.post<CreateCatSittingResponseSchema>(
          '/cat-sittings',
          {
            catId: cat.id,
            sitterId: catSitter.id,
            startTime: new Date(
              Date.now() - 4 * 24 * 60 * 60 * 1000
            ).toISOString(),
            endTime: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000
            ).toISOString(),
          } satisfies CreateCatSittingDto
        );
      expect(newSittingResponse.status).toBe(201);
      const newSitting = newSittingResponse.data.data;

      const updatedSittingResponse =
        await ownerClient.put<CreateCatSittingResponseSchema>(
          `/cat-sittings/${newSitting.id}/status`,
          {
            status: CatSittingStatus.COMPLETED,
          } satisfies UpdateCatSittingStatusDto
        );
      expect(updatedSittingResponse.status).toBe(200);

      const reviewResponse = await ownerClient.post<CreateReviewResponseSchema>(
        '/reviews',
        {
          catSittingId: newSitting.id,
          rating: 4,
          content: 'Very good service',
        } satisfies CreateReviewDto
      );

      expect(reviewResponse.status).toBe(201);
      expect(reviewResponse.data.data).toHaveProperty('id');
      expect(reviewResponse.data.data.catSittingId).toBe(newSitting.id);
      expect(reviewResponse.data.data.rating).toBe(4);
    });

    it('can view reviews they authored', async () => {
      const response = await ownerClient.get<GetReviewResponseSchema>(
        `/reviews/${review.id}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id', review.id);
    });

    it('can edit reviews they authored', async () => {
      const response = await ownerClient.put<UpdateReviewResponseSchema>(
        `/reviews/${review.id}`,
        {
          ...review,
          rating: 4,
          content: 'Updated comment',
        } satisfies UpdateReviewDto
      );

      expect(response.status).toBe(200);
      expect(response.data.data.rating).toBe(4);
      expect(response.data.data.content).toBe('Updated comment');

      review = response.data.data;
    });

    it('cannot delete their own reviews', async () => {
      const deleteResponse = await ownerClient.delete(`/reviews/${review.id}`);

      expect(deleteResponse.status).toBe(403);
    });
  });

  describe('Cat Sitter', () => {
    it('can view reviews about their service', async () => {
      const response = await sitterClient.get<GetReviewResponseSchema>(
        `/reviews/${review.id}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id', review.id);
    });

    it('cannot edit reviews about their service', async () => {
      const updateResponse = await sitterClient.put<UpdateReviewResponseSchema>(
        `/reviews/${review.id}`,
        {
          ...review,
          rating: 5,
          content: 'Sitter trying to modify review',
        } satisfies UpdateReviewDto
      );

      expect(updateResponse.status).toBe(403);
    });

    it('cannot delete reviews about their service', async () => {
      const deleteResponse = await sitterClient.delete(`/reviews/${review.id}`);

      expect(deleteResponse.status).toBe(403);
    });
  });

  describe('Admin', () => {
    it('can view any review', async () => {
      const response = await adminClient.get<GetReviewResponseSchema>(
        `/reviews/${review.id}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id', review.id);
    });

    it('can edit any review', async () => {
      const response = await adminClient.put<UpdateReviewResponseSchema>(
        `/reviews/${review.id}`,
        {
          ...review,
          rating: 3,
          content: 'Admin modified this review',
        } satisfies UpdateReviewDto
      );

      expect(response.status).toBe(200);
      expect(response.data.data.rating).toBe(3);
      expect(response.data.data.content).toBe('Admin modified this review');

      review = response.data.data;
    });

    it('can delete any review', async () => {
      const newSittingResponse =
        await ownerClient.post<CreateCatSittingResponseSchema>(
          '/cat-sittings',
          {
            catId: cat.id,
            sitterId: catSitter.id,
            startTime: new Date(
              Date.now() - 6 * 24 * 60 * 60 * 1000
            ).toISOString(),
            endTime: new Date(
              Date.now() - 5 * 24 * 60 * 60 * 1000
            ).toISOString(),
          } satisfies CreateCatSittingDto
        );
      expect(newSittingResponse.status).toBe(201);
      const newSitting = newSittingResponse.data.data;

      const updatedSittingResponse =
        await ownerClient.put<CreateCatSittingResponseSchema>(
          `/cat-sittings/${newSitting.id}/status`,
          {
            status: CatSittingStatus.COMPLETED,
          } satisfies UpdateCatSittingStatusDto
        );
      expect(updatedSittingResponse.status).toBe(200);

      const reviewResponse = await ownerClient.post<CreateReviewResponseSchema>(
        '/reviews',
        {
          catSittingId: newSitting.id,
          rating: 5,
          content: 'Review to be deleted by admin',
        } satisfies CreateReviewDto
      );
      expect(reviewResponse.status).toBe(201);
      const reviewToDelete = reviewResponse.data.data;

      const deleteResponse =
        await adminClient.delete<DeleteReviewResponseSchema>(
          `/reviews/${reviewToDelete.id}`
        );
      expect(deleteResponse.status).toBe(200);
    });
  });

  afterAll(async () => {
    await adminClient.delete(`/reviews/${review.id}`);
    await adminClient.delete(`/cat-sittings/${catSitting.id}`);
    await adminClient.delete(`/cats/${cat.id}`);
  });
});
