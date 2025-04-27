import { catRepository } from '@purrfect-sitter/cats-repositories';
import { catSittingRepository } from '@purrfect-sitter/cat-sittings-repositories';
import { CatSitting, CatSittingStatus } from '@purrfect-sitter/database';
import {
  castCatSitting,
  CreateCatSittingDto,
  dateFromString,
  UpdateCatSittingDto,
  UpdateCatSittingStatusDto,
} from '@purrfect-sitter/models';
import type {
  OpenFgaApi,
  TupleKey,
  TupleKeyWithoutCondition,
} from '@openfga/sdk';
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
    const sittings = await catSittingRepository.findAll();
    return sittings.map((sitting) => castCatSitting(sitting));
  }

  async findBySitterId(sitterId: string) {
    const sittings = await catSittingRepository.findBySitterId(sitterId);
    return sittings.map((sitting) => castCatSitting(sitting));
  }

  async findByCatId(catId: string) {
    const sittings = await catSittingRepository.findByCatId(catId);
    return sittings.map((sitting) => castCatSitting(sitting));
  }

  async findById(id: string) {
    const sitting = await catSittingRepository.findById(id);
    if (!sitting) {
      return null;
    }
    return castCatSitting(sitting);
  }

  async findActiveSittings() {
    const sittings = await catSittingRepository.findActiveByTimeRange(
      new Date()
    );
    return sittings.map((sitting) => castCatSitting(sitting));
  }

  async create(userId: string, createCatSittingDto: CreateCatSittingDto) {
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

    await this.createAuthRelationships(newCatSitting);

    return castCatSitting(newCatSitting);
  }

  async update(id: string, updateCatSittingDto: UpdateCatSittingDto) {
    const { startTime, endTime, ...partial } = updateCatSittingDto;
    const update = {
      ...partial,
      ...(startTime && {
        startTime: dateFromString(startTime),
      }),
      ...(endTime && {
        endTime: dateFromString(endTime),
      }),
    };

    const updated = await catSittingRepository.update(id, update);

    if (
      updated &&
      (updateCatSittingDto.startTime || updateCatSittingDto.endTime)
    ) {
      await this.updateAuthRelationships(updated);
    }

    return castCatSitting(updated);
  }

  async updateStatus(id: string, updateStatusDto: UpdateCatSittingStatusDto) {
    const updated = await catSittingRepository.update(id, {
      status: updateStatusDto.status,
    });

    return castCatSitting(updated);
  }

  async remove(id: string) {
    const sitting = await catSittingRepository.delete(id);
    if (sitting) {
      await this.deleteAuthRelationships(sitting);
    }
    return castCatSitting(sitting);
  }

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
      {
        user: `cat:${catSitting.catId}#owner`,
        relation: 'can_review',
        object: `cat_sitting:${catSitting.id}`,
        condition: {
          name: 'is_cat_sitting_completed',
          context: {
            completed_statuses: [CatSittingStatus.COMPLETED],
          },
        },
      },
      {
        user: `cat_sitting:${catSitting.id}#sitter`,
        relation: 'active_sitter',
        object: `cat_sitting:${catSitting.id}`,
        condition: {
          name: 'is_active_timeslot',
          context: {
            start_time: catSitting.startTime.toISOString(),
            end_time: catSitting.endTime.toISOString(),
          },
        },
      },
      {
        user: `cat_sitting:${catSitting.id}#sitter`,
        relation: 'pending_sitter',
        object: `cat_sitting:${catSitting.id}`,
        condition: {
          name: 'is_pending_timeslot',
          context: {
            start_time: catSitting.startTime.toISOString(),
          },
        },
      },
      {
        user: 'system:1',
        relation: 'system',
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

  private async updateAuthRelationships(catSitting: CatSitting) {
    // can't simply update the condition, need to delete and recreate
    // https://github.com/openfga/openfga/issues/2151
    // ideally, should be atomic
    await this.openfga.write(this.openfgaStoreId, {
      deletes: {
        tuple_keys: [
          {
            user: `cat_sitting:${catSitting.id}#sitter`,
            relation: 'active_sitter',
            object: `cat_sitting:${catSitting.id}`,
          },
          {
            user: `cat_sitting:${catSitting.id}#sitter`,
            relation: 'pending_sitter',
            object: `cat_sitting:${catSitting.id}`,
          },
        ],
      },
    });
    await this.openfga.write(this.openfgaStoreId, {
      writes: {
        tuple_keys: [
          {
            user: `cat_sitting:${catSitting.id}#sitter`,
            relation: 'active_sitter',
            object: `cat_sitting:${catSitting.id}`,
            condition: {
              name: 'is_active_timeslot',
              context: {
                start_time: catSitting.startTime.toISOString(),
                end_time: catSitting.endTime.toISOString(),
              },
            },
          },
          {
            user: `cat_sitting:${catSitting.id}#sitter`,
            relation: 'pending_sitter',
            object: `cat_sitting:${catSitting.id}`,
            condition: {
              name: 'is_pending_timeslot',
              context: {
                start_time: catSitting.startTime.toISOString(),
              },
            },
          },
        ],
      },
    });
  }

  private async deleteAuthRelationships(catSitting: CatSitting) {
    const tuples: TupleKeyWithoutCondition[] = [
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
      {
        user: `cat:${catSitting.catId}#owner`,
        relation: 'can_review',
        object: `cat_sitting:${catSitting.id}`,
      },
      {
        user: `cat_sitting:${catSitting.id}#sitter`,
        relation: 'active_sitter',
        object: `cat_sitting:${catSitting.id}`,
      },
      {
        user: 'system:1',
        relation: 'system',
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

// export const catSittingsService = new CatSittingsService();
