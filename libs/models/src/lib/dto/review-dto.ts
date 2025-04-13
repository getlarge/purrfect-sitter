import { Type } from '@sinclair/typebox';

export const ReviewSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  catSittingId: Type.String({ format: 'uuid' }),
  rating: Type.Integer({ minimum: 1, maximum: 5 }),
  content: Type.Optional(Type.String()),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

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

export type ReviewDto = typeof ReviewSchema['static'];
export type CreateReviewDto = typeof CreateReviewSchema['static'];
export type UpdateReviewDto = typeof UpdateReviewSchema['static'];