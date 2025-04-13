import { Type } from '@sinclair/typebox';
import { CatSchema, CreateCatSchema, UpdateCatSchema } from '../dto/cat-dto.js';

export const getCatParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const getCatsResponseSchema = Type.Object({
  data: Type.Array(CatSchema),
});

export const getCatResponseSchema = Type.Object({
  data: CatSchema,
});

export const createCatBodySchema = CreateCatSchema;

export const createCatResponseSchema = Type.Object({
  data: CatSchema,
});

export const updateCatParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const updateCatBodySchema = UpdateCatSchema;

export const updateCatResponseSchema = Type.Object({
  data: CatSchema,
});

export const deleteCatParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const deleteCatResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Optional(CatSchema),
});