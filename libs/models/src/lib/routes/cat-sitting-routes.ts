import { Type, type Static } from '@sinclair/typebox';
import {
  CatSittingSchema,
  CreateCatSittingSchema,
  UpdateCatSittingSchema,
  UpdateCatSittingStatusSchema,
} from '../dto/cat-sitting-dto.js';

export const getCatSittingParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const getCatSittingsResponseSchema = Type.Object({
  data: Type.Array(CatSittingSchema),
});

export type GetCatSittingsResponseSchema = Static<
  typeof getCatSittingsResponseSchema
>;

export const getCatSittingResponseSchema = Type.Object({
  data: CatSittingSchema,
});

export type GetCatSittingResponseSchema = Static<
  typeof getCatSittingResponseSchema
>;

export const createCatSittingBodySchema = CreateCatSittingSchema;

export const createCatSittingResponseSchema = Type.Object({
  data: CatSittingSchema,
});

export type CreateCatSittingResponseSchema = Static<
  typeof createCatSittingResponseSchema
>;

export const updateCatSittingParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const updateCatSittingBodySchema = UpdateCatSittingSchema;

export const updateCatSittingResponseSchema = Type.Object({
  data: CatSittingSchema,
});

export type UpdateCatSittingResponseSchema = Static<
  typeof updateCatSittingResponseSchema
>;

export const updateCatSittingStatusParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const updateCatSittingStatusBodySchema = UpdateCatSittingStatusSchema;

export const updateCatSittingStatusResponseSchema = Type.Object({
  data: CatSittingSchema,
});

export type UpdateCatSittingStatusResponseSchema = Static<
  typeof updateCatSittingStatusResponseSchema
>;

export const deleteCatSittingParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const deleteCatSittingResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Optional(CatSittingSchema),
});

export type DeleteCatSittingResponseSchema = Static<
  typeof deleteCatSittingResponseSchema
>;
