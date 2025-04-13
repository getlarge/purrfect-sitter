import { Type } from '@sinclair/typebox';
import { CreateReviewSchema, ReviewSchema, UpdateReviewSchema } from '../dto/review-dto.js';

export const getReviewParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const getReviewsResponseSchema = Type.Object({
  data: Type.Array(ReviewSchema),
});

export const getReviewResponseSchema = Type.Object({
  data: ReviewSchema,
});

export const createReviewBodySchema = CreateReviewSchema;

export const createReviewResponseSchema = Type.Object({
  data: ReviewSchema,
});

export const updateReviewParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const updateReviewBodySchema = UpdateReviewSchema;

export const updateReviewResponseSchema = Type.Object({
  data: ReviewSchema,
});

export const deleteReviewParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const deleteReviewResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Optional(ReviewSchema),
});