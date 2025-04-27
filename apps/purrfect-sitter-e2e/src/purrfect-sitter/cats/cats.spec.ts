import {
  createTestUser,
  createAuthenticatedClient,
  TestUser,
  createAdmin,
} from '../../support/test-utils';
import { AxiosInstance } from 'axios';
import {
  CatDto,
  CreateCatResponseSchema,
  DeleteCatResponseSchema,
  GetCatResponseSchema,
  UpdateCatResponseSchema,
} from '@purrfect-sitter/models';
import { randomBytes } from 'node:crypto';

const AUTH_STRATEGY = process.env.AUTH_STRATEGY;

describe(`Cat Resource Authorization Tests [${AUTH_STRATEGY}]`, () => {
  let catOwner: TestUser;
  let catSitter: TestUser;
  let admin: TestUser;

  let ownerClient: AxiosInstance;
  let sitterClient: AxiosInstance;
  let adminClient: AxiosInstance;

  let cat: CatDto;

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

    const response = await ownerClient.post<CreateCatResponseSchema>('/cats', {
      name: 'Whiskers',
      description: 'A fluffy test cat',
      breed: 'Test Breed',
      age: '3',
    });
    expect(response.status).toBe(201);

    cat = response.data.data;
  });

  describe('Cat Owner', () => {
    it('can create a cat', async () => {
      const response = await ownerClient.post<CreateCatResponseSchema>(
        '/cats',
        {
          name: 'Fluffy',
          description: 'Another test cat',
          breed: 'Test Breed',
          age: '2',
        }
      );

      expect(response.status).toBe(201);
      const cat = response.data.data;
      expect(cat).toHaveProperty('id');
      expect(cat.name).toBe('Fluffy');
      expect(cat.ownerId).toBe(catOwner.id);
    });

    it('can view their own cat', async () => {
      const response = await ownerClient.get<GetCatResponseSchema>(
        `/cats/${cat.id}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id', cat.id);
    });

    it('can update their own cat', async () => {
      const response = await ownerClient.put<UpdateCatResponseSchema>(
        `/cats/${cat.id}`,
        {
          name: 'Whiskers Updated',
          description: 'Updated description',
          breed: 'Updated Breed',
          age: '4',
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.name).toBe('Whiskers Updated');
    });

    it('can delete their own cat', async () => {
      const createResponse = await ownerClient.post<CreateCatResponseSchema>(
        '/cats',
        {
          name: 'To Delete',
          description: 'This cat will be deleted',
          breed: 'Test Breed',
          age: '1',
        }
      );

      const catToDelete = createResponse.data.data;

      const deleteResponse = await ownerClient.delete<DeleteCatResponseSchema>(
        `/cats/${catToDelete.id}`
      );
      expect(deleteResponse.status).toBe(200);

      const getResponse = await ownerClient.get<GetCatResponseSchema>(
        `/cats/${catToDelete.id}`
      );
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Cat Sitter', () => {
    it('can view cats', async () => {
      const response = await sitterClient.get<GetCatResponseSchema>(
        `/cats/${cat.id}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id', cat.id);
    });

    it("cannot update someone else's cat", async () => {
      const response = await sitterClient.put(`/cats/${cat.id}`, {
        name: 'Unauthorized Update',
        description: 'This should fail',
        breed: 'Test Breed',
        age: '3',
      });

      expect(response.status).toBe(403);
    });

    it("cannot delete someone else's cat", async () => {
      const response = await sitterClient.delete(`/cats/${cat.id}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Admin', () => {
    it('can view any cat', async () => {
      const response = await adminClient.get<GetCatResponseSchema>(
        `/cats/${cat.id}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id', cat.id);
    });

    it('can update any cat', async () => {
      const response = await adminClient.put<CreateCatResponseSchema>(
        `/cats/${cat.id}`,
        {
          name: 'Admin Updated',
          description: 'Admin has updated this cat',
          breed: 'Admin Breed',
          age: '5',
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.name).toBe('Admin Updated');
    });

    it('can delete any cat', async () => {
      const createResponse = await ownerClient.post<CreateCatResponseSchema>(
        '/cats',
        {
          name: 'Admin Will Delete',
          description: 'This cat will be deleted by admin',
          breed: 'Test Breed',
          age: '1',
        }
      );

      const catToDelete = createResponse.data.data;

      const deleteResponse = await adminClient.delete<DeleteCatResponseSchema>(
        `/cats/${catToDelete.id}`
      );
      expect(deleteResponse.status).toBe(200);

      const getResponse = await adminClient.get<GetCatResponseSchema>(
        `/cats/${catToDelete.id}`
      );
      expect(getResponse.status).toBe(404);
    });
  });

  afterAll(async () => {
    await adminClient.delete(`/cats/${cat.id}`);
  });
});
