import { Type } from '@sinclair/typebox';
import { castEntity } from './helpers.js';

export const ReviewSchema = Type.Object(
  {
    id: Type.String({
      format: 'uuid',
      default: '00000000-0000-0000-0000-000000000000',
    }),
    catSittingId: Type.String({
      format: 'uuid',
      default: '00000000-0000-0000-0000-000000000000',
    }),
    rating: Type.Integer({ minimum: 1, maximum: 5 }),
    content: Type.Optional(Type.String()),
    createdAt: Type.String({
      format: 'date-time',
      default: new Date().toISOString(),
    }),
    updatedAt: Type.String({
      format: 'date-time',
      default: new Date().toISOString(),
    }),
  },
  { title: 'Review' }
);

export const CreateReviewSchema = Type.Object({
  catSittingId: Type.String({ format: 'uuid' }),
  rating: Type.Integer({ minimum: 1, maximum: 5 }),
  content: Type.Optional(Type.String()),
});

export const UpdateReviewSchema = Type.Partial(
  Type.Object({
    rating: Type.Integer({ minimum: 1, maximum: 5 }),
    content: Type.Optional(Type.String()),
  })
);

export type ReviewDto = (typeof ReviewSchema)['static'];
export type CreateReviewDto = (typeof CreateReviewSchema)['static'];
export type UpdateReviewDto = (typeof UpdateReviewSchema)['static'];

export const castReview = (review: unknown): ReviewDto => {
  return castEntity(ReviewSchema, review);
};
