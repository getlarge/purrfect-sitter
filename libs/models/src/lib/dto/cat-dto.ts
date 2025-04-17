import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export const CatSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  age: Type.Optional(Type.String()),
  breed: Type.Optional(Type.String()),
  isActive: Type.Boolean(),
  attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  ownerId: Type.String({ format: 'uuid' }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export const CreateCatSchema = Type.Object({
  name: Type.String(),
  description: Type.Optional(Type.String()),
  age: Type.Optional(Type.String()),
  breed: Type.Optional(Type.String()),
  isActive: Type.Optional(Type.Boolean()),
  attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export const UpdateCatSchema = Type.Partial(
  Type.Object({
    name: Type.String(),
    description: Type.Optional(Type.String()),
    age: Type.Optional(Type.String()),
    breed: Type.Optional(Type.String()),
    isActive: Type.Boolean(),
    attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  })
);

export type CatDto = (typeof CatSchema)['static'];
export type CreateCatDto = (typeof CreateCatSchema)['static'];
export type UpdateCatDto = (typeof UpdateCatSchema)['static'];

export function castCat(sitting: unknown): CatDto {
  const c = Value.Convert(CatSchema, sitting);
  if (!Value.Check(CatSchema, c)) {
    throw new Error('Invalid data');
  }
  return c;
}
