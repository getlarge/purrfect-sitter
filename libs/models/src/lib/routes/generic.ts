import { Type } from '@sinclair/typebox';

export const errorResponseSchema = Type.Object({
  error: Type.String(),
});
