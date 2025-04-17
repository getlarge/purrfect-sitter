import { catRepository } from '@purrfect-sitter/cats-repositories';
import { castCat, CreateCatDto, UpdateCatDto } from '@purrfect-sitter/models';
import type { OpenFgaApi, TupleKey } from '@openfga/sdk';
import { getOpenFgaClient } from '@purrfect-sitter/auth-repositories';

export class CatsService {
  private openfga: OpenFgaApi;
  private openfgaStoreId: string;

  constructor() {
    const { client, storeId } = getOpenFgaClient();
    this.openfga = client;
    this.openfgaStoreId = storeId;
  }

  async findAll() {
    const cats = await catRepository.findAll();
    return cats.map((cat) => castCat(cat));
  }

  async findById(id: string) {
    const cat = await catRepository.findById(id);
    if (!cat) {
      return null;
    }
    return castCat(cat);
  }

  async findByOwnerId(ownerId: string) {
    const cats = await catRepository.findByOwnerId(ownerId);
    return cats.map((cat) => castCat(cat));
  }

  async create(ownerId: string, createCatDto: CreateCatDto) {
    const newCat = await catRepository.create({
      ...createCatDto,
      ownerId,
    });
    await this.createAuthRelationships(newCat.id, ownerId);

    return castCat(newCat);
  }

  async update(id: string, updateCatDto: UpdateCatDto) {
    const cat = await catRepository.update(id, updateCatDto);
    if (!cat) {
      return null;
    }
    return castCat(cat);
  }

  async remove(id: string) {
    const cat = await catRepository.delete(id);
    if (cat) {
      // Delete OpenFGA relationship tuples
      await this.deleteAuthRelationships(id, cat.ownerId);
    }

    return castCat(cat);
  }

  // Helper to create OpenFGA relationship tuples for authorization
  private async createAuthRelationships(catId: string, ownerId: string) {
    const tuples: TupleKey[] = [
      {
        user: `user:${ownerId}`,
        relation: 'owner',
        object: `cat:${catId}`,
      },
      // System tuple for future use (admin can manage all cats)
      {
        user: 'system:1',
        relation: 'system',
        object: `cat:${catId}`,
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
      // Even if OpenFGA relationship creation fails, the DB operation succeeded
      // In a production system, you'd want to handle this differently
    }
  }

  // Helper to delete OpenFGA relationship tuples
  private async deleteAuthRelationships(catId: string, ownerId: string) {
    const tuples: TupleKey[] = [
      {
        user: `user:${ownerId}`,
        relation: 'owner',
        object: `cat:${catId}`,
      },
      {
        user: 'system:1',
        relation: 'system',
        object: `cat:${catId}`,
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

export const catsService = new CatsService();
