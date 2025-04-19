import { Type, type Static } from '@sinclair/typebox';
import { CatSchema, CreateCatSchema, UpdateCatSchema } from '../dto/cat-dto.js';

export const getCatParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const getCatsResponseSchema = Type.Object({
  data: Type.Array(CatSchema),
});

export type GetCatsResponseSchema = Static<typeof getCatsResponseSchema>;

export const getCatResponseSchema = Type.Object({
  data: CatSchema,
});

export type GetCatResponseSchema = Static<typeof getCatResponseSchema>;

export const createCatBodySchema = CreateCatSchema;

export const createCatResponseSchema = Type.Object({
  data: CatSchema,
});

export type CreateCatResponseSchema = Static<typeof createCatResponseSchema>;

export const updateCatParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const updateCatBodySchema = UpdateCatSchema;

export const updateCatResponseSchema = Type.Object({
  data: CatSchema,
});

export type UpdateCatResponseSchema = Static<typeof updateCatResponseSchema>;

export const deleteCatParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const deleteCatResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Optional(CatSchema),
});

export type DeleteCatResponseSchema = Static<typeof deleteCatResponseSchema>;
