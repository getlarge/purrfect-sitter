import {
  CatDto,
  CatSittingDto,
  CreateCatDto,
  CreateCatResponseSchema,
  CreateCatSittingDto,
  CreateCatSittingResponseSchema,
  CreateReviewDto,
  CreateReviewResponseSchema,
  GetCatSittingResponseSchema,
  GetCatSittingsResponseSchema,
  GetReviewsResponseSchema,
  UpdateCatSittingDto,
  UpdateCatSittingResponseSchema,
  UpdateCatSittingStatusDto,
} from '@purrfect-sitter/models';
import {
  createTestUser,
  createAuthenticatedClient,
  TestUser,
  createAdmin,
} from '../../support/test-utils.js';
import { AxiosInstance } from 'axios';
import { randomBytes } from 'node:crypto';
import { CatSittingStatus } from '@purrfect-sitter/database';

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
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day later
      } satisfies CreateCatSittingDto);
    expect(sittingResponse.status).toBe(201);
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
        } satisfies CreateCatSittingDto
      );

      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty('id');
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
        `/cat-sittings/${catSitting.id}/status`,
        {
          status: CatSittingStatus.APPROVED,
        } satisfies UpdateCatSittingStatusDto
      );

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('approved');

      catSitting = response.data.data;
    });

    it('can mark a cat sitting as completed', async () => {
      const response = await ownerClient.put<UpdateCatSittingResponseSchema>(
        `/cat-sittings/${catSitting.id}/status`,
        {
          status: CatSittingStatus.COMPLETED,
        } satisfies UpdateCatSittingStatusDto
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
          content: 'Excellent service!',
        } satisfies CreateReviewDto
      );

      expect(reviewResponse.status).toBe(201);
      expect(reviewResponse.data.data).toHaveProperty('id');
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

    it("can update a cat sitting they're assigned to when sitting is not yet approved and started", async () => {
      const newSittingResponse =
        await ownerClient.post<CreateCatSittingResponseSchema>(
          '/cat-sittings',
          {
            catId: cat.id,
            sitterId: catSitter.id,
            startTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          } satisfies CreateCatSittingDto
        );
      expect(newSittingResponse.status).toBe(201);
      const newSitting = newSittingResponse.data.data;

      const updateResponse =
        await sitterClient.put<UpdateCatSittingResponseSchema>(
          `/cat-sittings/${newSitting.id}`,
          {
            ...newSitting,
            attributes: { note: 'Added some notes from the sitter' },
          } satisfies UpdateCatSittingDto
        );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.data.attributes?.['note']).toBe(
        'Added some notes from the sitter'
      );
    });

    it("cannot update a cat sitting they're assigned to when sitting is active", async () => {
      const newSittingResponse =
        await ownerClient.post<CreateCatSittingResponseSchema>(
          '/cat-sittings',
          {
            catId: cat.id,
            sitterId: catSitter.id,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          } satisfies CreateCatSittingDto
        );
      expect(newSittingResponse.status).toBe(201);
      const newSitting = newSittingResponse.data.data;

      await ownerClient.put<UpdateCatSittingResponseSchema>(
        `/cat-sittings/${newSitting.id}/status`,
        {
          status: CatSittingStatus.ACTIVE,
        } satisfies UpdateCatSittingStatusDto
      );

      const updateResponse =
        await sitterClient.put<UpdateCatSittingResponseSchema>(
          `/cat-sittings/${newSitting.id}`,
          {
            ...newSitting,
            attributes: { note: 'Added some notes from the sitter' },
          } satisfies UpdateCatSittingDto
        );

      expect(updateResponse.status).toBe(403);
    });

    it("cannot view cat sittings they're not assigned to", async () => {
      const otherSitter = await createTestUser(
        `other_sitter_${randomBytes(4).toString('hex')}@test.com`,
        randomBytes(8).toString('hex'),
        'other_cat_sitter'
      );

      const otherSittingResponse =
        await ownerClient.post<CreateCatSittingResponseSchema>(
          '/cat-sittings',
          {
            catId: cat.id,
            sitterId: otherSitter.id,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          } satisfies CreateCatSittingDto
        );

      expect(otherSittingResponse.status).toBe(201);
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
      const newSittingResponse =
        await ownerClient.post<CreateCatSittingResponseSchema>(
          '/cat-sittings',
          {
            catId: cat.id,
            sitterId: catSitter.id,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          } satisfies CreateCatSittingDto
        );

      expect(newSittingResponse.status).toBe(201);
      const newSitting = newSittingResponse.data.data;

      const updateResponse =
        await adminClient.put<UpdateCatSittingResponseSchema>(
          `/cat-sittings/${newSitting.id}`,
          {
            ...newSitting,
            status: CatSittingStatus.APPROVED,
            attributes: { note: 'Admin approved' },
          } satisfies UpdateCatSittingDto
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
