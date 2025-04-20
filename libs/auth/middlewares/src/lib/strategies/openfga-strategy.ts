import type { CheckRequest } from '@openfga/sdk';
import { catSittingRepository } from '@purrfect-sitter/cat-sittings-repositories';
import { getOpenFgaClient } from '@purrfect-sitter/auth-repositories';
import {
  IAuthorizationCheck,
  IAuthorizationStrategy,
} from './strategy-interface.js';

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
      context: await this.getContext(action, resource, resourceId),
    };

    try {
      const { allowed, resolution } = await client.check(storeId, request);
      const granted = allowed ?? false;
      if (!granted) {
        console.warn(
          `Authorization check failed for user ${userId} on ${resource}:${resourceId} with action ${action}`,
          resolution
        );
      }
      return granted;
    } catch (error) {
      console.error('OpenFGA check failed', error);
      return false;
    }
  }

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
          case 'view':
            return 'can_view';
          case 'update':
            return 'can_update';
          case 'delete':
            return 'can_delete';
          case 'post_updates':
            return 'can_post_updates';
          case 'review':
            return 'can_review';
          default:
            return action;
        }
      case 'review':
        switch (action) {
          case 'delete':
            return 'can_delete';
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

  private async getContext(
    action: string,
    resource: string,
    resourceId: string
  ): Promise<object> {
    if (resource === 'cat_sitting') {
      if (['delete', 'update', 'post_updates'].includes(action)) {
        const now = new Date();
        return {
          current_time: now.toISOString(),
        };
      }

      if (action === 'review') {
        const catSitting = await catSittingRepository.findById(resourceId);
        return {
          cat_sitting_attributes: { status: catSitting?.status ?? 'unknown' },
        };
      }
    }

    return {};
  }
}

export const openfgaAuthStrategy = new OpenFgaStrategy();
