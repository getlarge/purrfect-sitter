import { Type } from '@sinclair/typebox';
import { castEntity } from './helpers.js';

export const UserSchema = Type.Object(
  {
    id: Type.String({
      format: 'uuid',
      default: '00000000-0000-0000-0000-000000000000',
    }),
    displayName: Type.Optional(Type.String()),
    createdAt: Type.String({
      format: 'date-time',
      default: new Date().toISOString(),
    }),
    updatedAt: Type.String({
      format: 'date-time',
      default: new Date().toISOString(),
    }),
  },
  { title: 'User', additionalProperties: false }
);

export const CreateUserSchema = Type.Object(
  {
    email: Type.String({ format: 'email' }),
    displayName: Type.Optional(Type.String()),
  },
  { title: 'CreateUser', additionalProperties: false }
);

export const UpdateUserSchema = Type.Partial(
  Type.Object(
    {
      email: Type.String({ format: 'email' }),
      displayName: Type.Optional(Type.String()),
    },
    { title: 'UpdateUser', additionalProperties: false }
  )
);

export type UserDto = (typeof UserSchema)['static'];
export type CreateUserDto = (typeof CreateUserSchema)['static'];
export type UpdateUserDto = (typeof UpdateUserSchema)['static'];

export function castUser(user: unknown): UserDto {
  return castEntity(UserSchema, user);
}
