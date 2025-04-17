import { Type } from '@sinclair/typebox';
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

export const getCatSittingResponseSchema = Type.Object({
  data: CatSittingSchema,
});

export const createCatSittingBodySchema = CreateCatSittingSchema;

export const createCatSittingResponseSchema = Type.Object({
  data: CatSittingSchema,
});

export const updateCatSittingParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const updateCatSittingBodySchema = UpdateCatSittingSchema;

export const updateCatSittingResponseSchema = Type.Object({
  data: CatSittingSchema,
});

export const updateCatSittingStatusParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const updateCatSittingStatusBodySchema = UpdateCatSittingStatusSchema;

export const updateCatSittingStatusResponseSchema = Type.Object({
  data: CatSittingSchema,
});

export const deleteCatSittingParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const deleteCatSittingResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Optional(CatSittingSchema),
});
