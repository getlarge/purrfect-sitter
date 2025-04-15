export * from './lib/authorize.middleware.js';
export * from './lib/session.middleware.js';

import 'fastify';
import type { IAuthorizationParams } from './lib/authorize.middleware.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ISessionUser } from '@purrfect-sitter/auth-repositories';

declare module 'fastify' {
  interface FastifyInstance {
    user?: ISessionUser;
    // To measure the performance of the authorization middleware
    authStartTime?: number;
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    authorize: (
      params: IAuthorizationParams
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
