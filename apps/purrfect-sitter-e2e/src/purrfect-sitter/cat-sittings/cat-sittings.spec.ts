import {
  CatDto,
  CatSittingDto,
  CreateCatResponseSchema,
  CreateCatSittingResponseSchema,
  CreateReviewResponseSchema,
  GetCatSittingResponseSchema,
  GetCatSittingsResponseSchema,
  GetReviewsResponseSchema,
  UpdateCatSittingResponseSchema,
} from '@purrfect-sitter/models';
import {
  createTestUser,
  createAuthenticatedClient,
  TestUser,
  createAdmin,
} from '../../support/test-utils';
import { AxiosInstance } from 'axios';

const AUTH_STRATEGY = process.env.AUTH_STRATEGY;

describe(`Cat Sitting Resource Authorization Tests [${AUTH_STRATEGY}]`, () => {
  let catOwner: TestUser;
  let catSitter: TestUser;
  let admin: TestUser;

  let ownerClient: AxiosInstance;
  let sitterClient: AxiosInstance;
  let adminClient: AxiosInstance;

  let cat: CatDto;
  let catSitting: CatSittingDto;

  beforeAll(async () => {
    catOwner = await createTestUser('cat_owner@test.com', 'cat_owner');
    catSitter = await createTestUser('cat_sitter@test.com', 'cat_sitter');
    admin = await createTestUser('admin@test.com', 'admin');
    await createAdmin(admin.id);

    ownerClient = createAuthenticatedClient(catOwner.sessionToken);
    sitterClient = createAuthenticatedClient(catSitter.sessionToken);
    adminClient = createAuthenticatedClient(admin.sessionToken);

    // Create a test cat
    const catResponse = await ownerClient.post<CreateCatResponseSchema>(
      '/cats',
      {
        name: 'Whiskers',
        description: 'A fluffy test cat',
        breed: 'Test Breed',
        age: '3',
      }
    );

    cat = catResponse.data.data;

    const sittingResponse =
      await ownerClient.post<CreateCatSittingResponseSchema>('/cat-sittings', {
        catId: cat.id,
        sitterId: catSitter.id,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day later
        status: 'requested',
      });

    catSitting = sittingResponse.data.data;
  });

  describe('Cat Owner', () => {
    it('can create a cat sitting request', async () => {
      const response = await ownerClient.post<CreateCatSittingResponseSchema>(
        '/cat-sittings',
        {
          catId: cat.id,
          sitterId: catSitter.id,
          startTime: new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000
          ).toISOString(), // 2 days later
          endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days later
          status: 'requested',
        }
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.data.catId).toBe(cat.id);
      expect(response.data.data.sitterId).toBe(catSitter.id);
    });

    it("can view their cat's sitting", async () => {
      const response = await ownerClient.get<GetCatSittingResponseSchema>(
        `/cat-sittings/${catSitting.id}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id', catSitting.id);
    });

    it('can update a cat sitting status', async () => {
      const response = await ownerClient.put<UpdateCatSittingResponseSchema>(
        `/cat-sittings/${catSitting.id}`,
        {
          ...catSitting,
          status: 'approved',
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('approved');

      catSitting = response.data.data;
    });

    it('can mark a cat sitting as completed', async () => {
      const response = await ownerClient.put<UpdateCatSittingResponseSchema>(
        `/cat-sittings/${catSitting.id}`,
        {
          ...catSitting,
          status: 'completed',
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('completed');

      catSitting = response.data.data;
    });

    it('can add a review after completion', async () => {
      const reviewResponse = await ownerClient.post<CreateReviewResponseSchema>(
        '/reviews',
        {
          catSittingId: catSitting.id,
          rating: 5,
          comment: 'Excellent service!',
        }
      );

      expect(reviewResponse.status).toBe(201);
      expect(reviewResponse.data).toHaveProperty('id');
      expect(reviewResponse.data.data.catSittingId).toBe(catSitting.id);
      expect(reviewResponse.data.data.rating).toBe(5);
    });
  });

  describe('Cat Sitter', () => {
    it('can view assigned cat sittings', async () => {
      const response = await sitterClient.get<GetCatSittingResponseSchema>(
        `/cat-sittings/${catSitting.id}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id', catSitting.id);
    });

    it("can update a cat sitting they're assigned to", async () => {
      // Create a new cat sitting for testing
      const newSittingResponse =
        await ownerClient.post<CreateCatSittingResponseSchema>(
          '/cat-sittings',
          {
            catId: cat.id,
            sitterId: catSitter.id,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'approved',
          }
        );

      const newSitting = newSittingResponse.data.data;

      const updateResponse =
        await sitterClient.put<UpdateCatSittingResponseSchema>(
          `/cat-sittings/${newSitting.id}`,
          {
            ...newSitting,
            attributes: { note: 'Added some notes from the sitter' },
          }
        );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.data.attributes?.['note']).toBe(
        'Added some notes from the sitter'
      );
    });

    it("cannot view cat sittings they're not assigned to", async () => {
      const otherSitter = await createTestUser(
        'other_sitter@test.com',
        'cat_sitter'
      );

      const otherSittingResponse =
        await ownerClient.post<CreateCatSittingResponseSchema>(
          '/cat-sittings',
          {
            catId: cat.id,
            sitterId: otherSitter.id,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'requested',
          }
        );

      const otherSitting = otherSittingResponse.data.data;

      const getResponse = await sitterClient.get<GetCatSittingResponseSchema>(
        `/cat-sittings/${otherSitting.id}`
      );
      expect(getResponse.status).toBe(403);
    });
  });

  describe('Admin', () => {
    it('can view any cat sitting', async () => {
      const response = await adminClient.get<GetCatSittingResponseSchema>(
        `/cat-sittings/${catSitting.id}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id', catSitting.id);
    });

    it('can update any cat sitting', async () => {
      // Create a new cat sitting for testing
      const newSittingResponse =
        await ownerClient.post<CreateCatSittingResponseSchema>(
          '/cat-sittings',
          {
            catId: cat.id,
            sitterId: catSitter.id,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'requested',
          }
        );

      const newSitting = newSittingResponse.data.data;

      // Admin updates the sitting
      const updateResponse =
        await adminClient.put<UpdateCatSittingResponseSchema>(
          `/cat-sittings/${newSitting.id}`,
          {
            ...newSitting,
            status: 'approved',
            attributes: { note: 'Admin approved' },
          }
        );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.data.status).toBe('approved');
      expect(updateResponse.data.data.attributes?.['note']).toBe(
        'Admin approved'
      );
    });
  });

  afterAll(async () => {
    const reviewsResponse = await adminClient.get<GetReviewsResponseSchema>(
      '/reviews'
    );
    for (const review of reviewsResponse.data.data) {
      if (review.catSittingId === catSitting.id) {
        await adminClient.delete(`/reviews/${review.id}`);
      }
    }

    const sittingsResponse =
      await adminClient.get<GetCatSittingsResponseSchema>('/cat-sittings');
    for (const sitting of sittingsResponse.data.data) {
      if (sitting.catId === cat.id) {
        await adminClient.delete(`/cat-sittings/${sitting.id}`);
      }
    }

    await adminClient.delete(`/cats/${cat.id}`);
  });
});
