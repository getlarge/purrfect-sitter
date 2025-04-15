import { catRepository } from '@purrfect-sitter/database';
import { CreateCatDto, UpdateCatDto } from '@purrfect-sitter/models';
import { TupleKey } from '@openfga/sdk';
import { openfgaAuthStrategy } from '@purrfect-sitter/auth';

export class CatsService {
  async findAll() {
    return catRepository.findAll();
  }

  async findById(id: string) {
    return catRepository.findById(id);
  }

  async findByOwnerId(ownerId: string) {
    return catRepository.findByOwnerId(ownerId);
  }

  async create(ownerId: string, createCatDto: CreateCatDto) {
    const newCat = await catRepository.create({
      ...createCatDto,
      ownerId,
    });

    // Create OpenFGA relationship tuples for the new cat
    await this.createAuthRelationships(newCat.id, ownerId);

    return newCat;
  }

  async update(id: string, updateCatDto: UpdateCatDto) {
    return catRepository.update(id, updateCatDto);
  }

  async remove(id: string) {
    const cat = await catRepository.delete(id);

    if (cat) {
      // Delete OpenFGA relationship tuples
      await this.deleteAuthRelationships(id, cat.ownerId);
    }

    return cat;
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
      await openfgaAuthStrategy.writeTuples(tuples);
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
      await openfgaAuthStrategy.deleteTuples(tuples);
    } catch (error) {
      console.error('Failed to delete authorization relationships:', error);
    }
  }
}

export const catsService = new CatsService();
