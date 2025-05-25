export * from './lib/authorize.middleware.js';
export * from './lib/session.middleware.js';

import 'fastify';
import type { IAuthorizationParams } from './lib/authorize.middleware.js';
import type { ISessionUser } from '@purrfect-sitter/auth-repositories';
import type { FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: ISessionUser;
  }

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
