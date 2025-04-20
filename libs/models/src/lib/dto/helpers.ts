import { FormatRegistry, TObject, TProperties, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

FormatRegistry.Set('uuid', (value: string) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
});

FormatRegistry.Set('date-time', (value) => {
  const date = new Date(value);
  return !isNaN(date.getTime());
});

export const DateTransformer = Type.Transform(
  Type.String({ format: 'date-time' })
)
  .Decode((value) => new Date(value)) // decode: string to Date
  .Encode((value) => (value instanceof Date ? value.toISOString() : value)); // encode: Date to string

export const dateFromString = (date: string) =>
  Value.Decode(DateTransformer, date);
export const stringFromDate = (date: Date) =>
  Value.Encode(DateTransformer, date);

// UUID transformer (mostly for validation purposes)
export const UuidTransformer = Type.Transform(Type.String({ format: 'uuid' }))
  .Decode((value) => value) // Just validate, no transformation needed
  .Encode((value) => value);

// Optional Record transformer to handle null values
export const OptionalRecordTransformer = Type.Transform(
  Type.Optional(Type.Record(Type.String(), Type.Unknown()))
)
  .Decode((value) => (value === null ? undefined : value))
  .Encode((value) => value || {});

export function castEntity<T extends TObject<TProperties>>(
  schema: T,
  value: unknown
) {
  const casted = Value.Cast(schema, value);
  if (!Value.Check(schema, casted)) {
    const errors = Value.Errors(schema, casted);
    for (const error of errors) {
      console.warn(`Invalid property:`, error);
    }
    throw new Error(`Invalid ${schema.title} data`);
  }
  return casted;
}
