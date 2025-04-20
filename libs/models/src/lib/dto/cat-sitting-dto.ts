import { Type } from '@sinclair/typebox';
import { CatSittingStatus } from '@purrfect-sitter/database';
import { castEntity } from './helpers.js';

export const CatSittingSchema = Type.Object(
  {
    id: Type.String({
      format: 'uuid',
      default: '00000000-0000-0000-0000-000000000000',
    }),
    catId: Type.String({
      format: 'uuid',
      default: '00000000-0000-0000-0000-000000000000',
    }),
    sitterId: Type.String({
      format: 'uuid',
      default: '00000000-0000-0000-0000-000000000000',
    }),
    status: Type.Enum(CatSittingStatus),
    startTime: Type.String({
      format: 'date-time',
      default: new Date().toISOString(),
    }),
    endTime: Type.String({
      format: 'date-time',
      default: new Date().toISOString(),
    }),
    attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    createdAt: Type.String({
      format: 'date-time',
      default: new Date().toISOString(),
    }),
    updatedAt: Type.String({
      format: 'date-time',
      default: new Date().toISOString(),
    }),
  },
  { title: 'CatSitting' }
);

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
  return castEntity(CatSittingSchema, sitting);
}
