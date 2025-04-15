import { CheckRequest, TupleKey, WriteRequest } from '@openfga/sdk';
import { getOpenFgaClient } from '@purrfect-sitter/auth-repositories';
import {
  IAuthorizationCheck,
  IAuthorizationStrategy,
} from './strategy-interface.js';

// OpenFGA-backed authorization strategy
export class OpenFgaStrategy implements IAuthorizationStrategy {
  async check(params: IAuthorizationCheck): Promise<boolean> {
    const { userId, action, resource, resourceId } = params;
    const { client, storeId } = getOpenFgaClient();

    const request: CheckRequest = {
      tuple_key: {
        user: `user:${userId}`,
        relation: this.mapActionToRelation(action, resource),
        object: `${resource}:${resourceId}`,
      },
      // Contextual tuples for time-based conditions
      contextual_tuples: {
        tuple_keys: this.getContextualTuples(action, resource),
      },
    };

    try {
      const { allowed } = await client.check(storeId, request);
      return allowed ?? false;
    } catch (error) {
      console.error('OpenFGA check failed', error);
      return false;
    }
  }

  // Write FGA relationship tuples when resources are created or updated
  async writeTuples(tuples: TupleKey[]): Promise<void> {
    const { client, storeId } = getOpenFgaClient();

    const request: WriteRequest = {
      writes: {
        tuple_keys: tuples,
      },
    };

    await client.write(storeId, request);
  }

  // Delete FGA relationship tuples when resources are deleted
  async deleteTuples(tuples: TupleKey[]): Promise<void> {
    const { client, storeId } = getOpenFgaClient();

    const request: WriteRequest = {
      deletes: {
        tuple_keys: tuples,
      },
    };

    await client.write(storeId, request);
  }

  // Map API actions to OpenFGA relations
  // TODO: replace global logic with a more flexible mapping based on route metadata
  private mapActionToRelation(action: string, resource: string): string {
    switch (resource) {
      case 'cat':
        switch (action) {
          case 'manage':
          case 'update':
          case 'delete':
            return 'can_manage';
          default:
            return action;
        }
      case 'cat_sitting':
        switch (action) {
          case 'post_updates':
            return 'can_post_updates';
          case 'review':
            return 'can_review';
          default:
            return action;
        }
      case 'review':
        switch (action) {
          case 'edit':
            return 'can_edit';
          case 'view':
            return 'can_view';
          default:
            return action;
        }
      case 'system':
        return action;
      default:
        return action;
    }
  }

  // Get contextual tuples for time-based conditions
  private getContextualTuples(action: string, resource: string): TupleKey[] {
    const contextualTuples: TupleKey[] = [];

    // For active sitter condition
    if (resource === 'cat_sitting' && action === 'post_updates') {
      const now = new Date();

      contextualTuples.push({
        user: 'cat_sitting#sitter',
        relation: 'is_active_timeslot',
        object: '',
        condition: {
          name: 'is_active_timeslot',
          context: {
            current_time: now.toISOString(),
          },
        },
      });
    }

    // For completed sitting condition
    if (resource === 'cat_sitting' && action === 'review') {
      contextualTuples.push({
        user: 'cat#owner',
        relation: 'is_cat_sitting_completed',
        object: '',
        condition: {
          name: 'is_cat_sitting_completed',
          context: {
            completed_statuses: ['completed'],
            cat_sitting_attributes: { status: 'completed' },
          },
        },
      });
    }

    return contextualTuples;
  }
}

export const openfgaAuthStrategy = new OpenFgaStrategy();
