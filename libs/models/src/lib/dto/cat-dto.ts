import { Type } from '@sinclair/typebox';
import { castEntity } from './helpers.js';

export const CatSchema = Type.Object(
  {
    id: Type.String({
      format: 'uuid',
      default: '00000000-0000-0000-0000-000000000000',
    }),
    name: Type.String(),
    description: Type.Optional(Type.String()),
    age: Type.Optional(Type.String()),
    breed: Type.Optional(Type.String()),
    isActive: Type.Boolean(),
    attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    ownerId: Type.String({
      format: 'uuid',
      default: '00000000-0000-0000-0000-000000000000',
    }),
    createdAt: Type.String({
      format: 'date-time',
      default: new Date().toISOString(),
    }),
    updatedAt: Type.String({
      format: 'date-time',
      default: new Date().toISOString(),
    }),
  },
  { title: 'Cat' }
);

export const CreateCatSchema = Type.Object(
  {
    name: Type.String(),
    description: Type.Optional(Type.String()),
    age: Type.Optional(Type.String()),
    breed: Type.Optional(Type.String()),
    isActive: Type.Optional(Type.Boolean()),
    attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  { title: 'CreateCat' }
);

export const UpdateCatSchema = Type.Partial(
  Type.Object(
    {
      name: Type.String(),
      description: Type.Optional(Type.String()),
      age: Type.Optional(Type.String()),
      breed: Type.Optional(Type.String()),
      isActive: Type.Boolean(),
      attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    },
    { title: 'UpdateCat' }
  )
);

export type CatDto = (typeof CatSchema)['static'];
export type CreateCatDto = (typeof CreateCatSchema)['static'];
export type UpdateCatDto = (typeof UpdateCatSchema)['static'];

/**
 * Convert a database cat entity to a CatDto
 * @param cat Cat entity from database
 * @returns Validated CatDto
 */
export function castCat(cat: unknown): CatDto {
  return castEntity(CatSchema, cat);
}
