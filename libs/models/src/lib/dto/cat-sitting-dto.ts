import { Type } from '@sinclair/typebox';
import { CatSittingStatus } from '@purrfect-sitter/database';
import { Value } from '@sinclair/typebox/value';

export const CatSittingSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  catId: Type.String({ format: 'uuid' }),
  sitterId: Type.String({ format: 'uuid' }),
  status: Type.Enum(CatSittingStatus),
  startTime: Type.String({ format: 'date-time' }),
  endTime: Type.String({ format: 'date-time' }),
  attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export const CreateCatSittingSchema = Type.Object({
  catId: Type.String({ format: 'uuid' }),
  sitterId: Type.String({ format: 'uuid' }),
  startTime: Type.String({ format: 'date-time' }),
  endTime: Type.String({ format: 'date-time' }),
  attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export const UpdateCatSittingSchema = Type.Partial(
  Type.Object({
    status: Type.Enum(CatSittingStatus),
    startTime: Type.String({ format: 'date-time' }),
    endTime: Type.String({ format: 'date-time' }),
    attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  })
);

export const UpdateCatSittingStatusSchema = Type.Object({
  status: Type.Enum(CatSittingStatus),
});

export type CatSittingDto = (typeof CatSittingSchema)['static'];
export type CreateCatSittingDto = (typeof CreateCatSittingSchema)['static'];
export type UpdateCatSittingDto = (typeof UpdateCatSittingSchema)['static'];
export type UpdateCatSittingStatusDto =
  (typeof UpdateCatSittingStatusSchema)['static'];

export function castCatSitting(sitting: unknown): CatSittingDto {
  const s = Value.Convert(CatSittingSchema, sitting);
  if (!Value.Check(CatSittingSchema, s)) {
    throw new Error('Invalid data');
  }
  return s;
}
