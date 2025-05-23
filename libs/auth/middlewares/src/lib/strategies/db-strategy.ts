import { catRepository } from '@purrfect-sitter/cats-repositories';
import { catSittingRepository } from '@purrfect-sitter/cat-sittings-repositories';
import { reviewRepository } from '@purrfect-sitter/reviews-repositories';
import { userRepository } from '@purrfect-sitter/users-repositories';
import {
  IAuthorizationCheck,
  IAuthorizationStrategy,
} from './strategy-interface.js';

export class DbAuthStrategy implements IAuthorizationStrategy {
  async check(params: IAuthorizationCheck): Promise<boolean> {
    const { userId, action, resource, resourceId } = params;

    switch (resource) {
      case 'cat':
        return this.checkCatPermission(userId, action, resourceId);
      case 'cat_sitting':
        return this.checkCatSittingPermission(userId, action, resourceId);
      case 'review':
        return this.checkReviewPermission(userId, action, resourceId);
      case 'system':
        return this.checkSystemPermission(userId, action);
      default:
        return false;
    }
  }

  private async checkCatPermission(
    userId: string,
    action: string,
    catId: string
  ): Promise<boolean> {
    const cat = await catRepository.findById(catId);
    if (!cat) return false;

    switch (action) {
      case 'view':
        return true; // All cats are public
      case 'manage':
      case 'update':
      case 'delete':
        return cat.ownerId === userId || (await this.isSystemAdmin(userId));
      default:
        return false;
    }
  }

  private async checkCatSittingPermission(
    userId: string,
    action: string,
    sittingId: string
  ): Promise<boolean> {
    const sitting = await catSittingRepository.findById(sittingId);
    if (!sitting) return false;

    const cat = await catRepository.findById(sitting.catId);
    if (!cat) return false;

    const isOwner = cat.ownerId === userId;
    const isSitter = sitting.sitterId === userId;
    const isAdmin = await this.isSystemAdmin(userId);

    const now = new Date();
    const isActive = () =>
      sitting.status === 'active' &&
      new Date(sitting.startTime) <= now &&
      new Date(sitting.endTime) >= now;

    const isPending = () =>
      sitting.status === 'requested' &&
      new Date(sitting.startTime) > now

    switch (action) {
      case 'view':
        return isOwner || isSitter || isAdmin;
      case 'delete':
        return isOwner || (isSitter && isPending()) || isAdmin;
      case 'update':
        return isOwner || (isSitter && isPending()) || isAdmin;
      case 'post_updates':
        return isOwner || (isSitter && isActive()) || isAdmin;
      case 'review':
        return isOwner && sitting.status === 'completed';
      default:
        return false;
    }
  }

  private async checkReviewPermission(
    userId: string,
    action: string,
    reviewId: string
  ): Promise<boolean> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) return false;

    const sitting = await catSittingRepository.findById(review.catSittingId);
    if (!sitting) return false;

    const cat = await catRepository.findById(sitting.catId);
    if (!cat) return false;

    const isAuthor = cat.ownerId === userId; // Review author is the cat owner
    const isAdmin = await this.isSystemAdmin(userId);

    switch (action) {
      case 'view':
        return true; // All reviews are public
      case 'edit':
      case 'delete':
        return isAuthor || isAdmin;
      default:
        return false;
    }
  }

  private async checkSystemPermission(
    userId: string,
    action: string
  ): Promise<boolean> {
    switch (action) {
      case 'admin':
        return this.isSystemAdmin(userId);
      default:
        return false;
    }
  }

  private async isSystemAdmin(userId: string): Promise<boolean> {
    const user = await userRepository.findById(userId);
    if (!user) return false;
    return user.role === 'admin';
  }
}

export const dbAuthStrategy = new DbAuthStrategy();
