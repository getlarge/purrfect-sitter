import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export const DateTransformer = Type.Transform(Type.String())
  .Decode((value) => new Date(value)) // decode: string to Date
  .Encode((value) => value.toISOString()); // encode: Date to string

export const dateFromString = (date: string) => Value.Decode(DateTransformer, date);
export const stringFromDate = (date: Date) => Value.Encode(DateTransformer, date);
