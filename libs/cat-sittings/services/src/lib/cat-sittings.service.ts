import { catRepository } from '@purrfect-sitter/cats-repositories';
import { catSittingRepository } from '@purrfect-sitter/cat-sittings-repositories';
import { CatSitting, CatSittingStatus } from '@purrfect-sitter/database';
import {
  CreateCatSittingDto,
  UpdateCatSittingDto,
  UpdateCatSittingStatusDto,
} from '@purrfect-sitter/models';
import type { OpenFgaApi, TupleKey } from '@openfga/sdk';
import { getOpenFgaClient } from '@purrfect-sitter/auth-repositories';

export class CatSittingsService {
  private openfga: OpenFgaApi;
  private openfgaStoreId: string;

  constructor() {
    const { client, storeId } = getOpenFgaClient();
    this.openfga = client;
    this.openfgaStoreId = storeId;
  }

  async findAll() {
    return catSittingRepository.findAll();
  }

  async findBySitterId(sitterId: string) {
    return catSittingRepository.findBySitterId(sitterId);
  }

  async findByCatId(catId: string) {
    return catSittingRepository.findByCatId(catId);
  }

  async findById(id: string) {
    return catSittingRepository.findById(id);
  }

  async findActiveSittings() {
    return catSittingRepository.findActiveByTimeRange(new Date());
  }

  async create(userId: string, createCatSittingDto: CreateCatSittingDto) {
    // Verify the cat exists and user has permission to create sitting
    const cat = await catRepository.findById(createCatSittingDto.catId);
    if (!cat) {
      throw new Error('Cat not found');
    }

    const newCatSitting = await catSittingRepository.create({
      ...createCatSittingDto,
      startTime: new Date(createCatSittingDto.startTime),
      endTime: new Date(createCatSittingDto.endTime),
      status: CatSittingStatus.REQUESTED,
    });

    // Create OpenFGA relationship tuples for the new cat sitting
    await this.createAuthRelationships(newCatSitting);

    return newCatSitting;
  }

  async update(id: string, updateCatSittingDto: UpdateCatSittingDto) {
    const updated = await catSittingRepository.update(id, updateCatSittingDto);

    // If status changed, update the OpenFGA relationships
    if (updated && updateCatSittingDto.status) {
      await this.updateAuthRelationships(updated);
    }

    return updated;
  }

  async updateStatus(id: string, updateStatusDto: UpdateCatSittingStatusDto) {
    const updated = await catSittingRepository.update(id, {
      status: updateStatusDto.status,
    });

    if (updated) {
      await this.updateAuthRelationships(updated);
    }

    return updated;
  }

  async remove(id: string) {
    const sitting = await catSittingRepository.delete(id);

    if (sitting) {
      // Delete OpenFGA relationship tuples
      await this.deleteAuthRelationships(sitting);
    }

    return sitting;
  }

  // Helper to create OpenFGA relationship tuples for authorization
  private async createAuthRelationships(catSitting: CatSitting) {
    const tuples: TupleKey[] = [
      {
        user: `cat:${catSitting.catId}`,
        relation: 'cat',
        object: `cat_sitting:${catSitting.id}`,
      },
      {
        user: `user:${catSitting.sitterId}`,
        relation: 'sitter',
        object: `cat_sitting:${catSitting.id}`,
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

  // Helper to update OpenFGA relationship tuples when status changes
  private async updateAuthRelationships(catSitting: CatSitting) {
    // No specific update needed in current model
    // This would be the place to handle any status-based authorization changes
    // For example, if completed sittings need special permissions
  }

  // Helper to delete OpenFGA relationship tuples
  private async deleteAuthRelationships(catSitting: CatSitting) {
    const tuples: TupleKey[] = [
      {
        user: `cat:${catSitting.catId}`,
        relation: 'cat',
        object: `cat_sitting:${catSitting.id}`,
      },
      {
        user: `user:${catSitting.sitterId}`,
        relation: 'sitter',
        object: `cat_sitting:${catSitting.id}`,
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

export const catSittingsService = new CatSittingsService();
