import { FastifyReply, FastifyRequest } from 'fastify';
import { getAuthStrategy } from '../auth.js';
import { dbAuthStrategy } from '../strategies/db-strategy.js';
import { openfgaAuthStrategy } from '../strategies/openfga-strategy.js';
import fp from 'fastify-plugin';

export interface IAuthorizationParams {
  action: string;
  resource: string;
  resourceId: string;
}

// Generic authorization middleware that uses the configured strategy
export const authorize = (params: IAuthorizationParams) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        throw new Error('User not authenticated');
      }

      const strategy =
        getAuthStrategy() === 'db' ? dbAuthStrategy : openfgaAuthStrategy;

      const startTime = performance.now();

      const isAuthorized = await strategy.check({
        userId: request.user.id,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
      });

      const endTime = performance.now();

      // Log authorization timing for performance comparison
      request.log.info(
        {
          authStrategy: getAuthStrategy(),
          durationMs: endTime - startTime,
          action: params.action,
          resource: params.resource,
        },
        'Authorization check completed'
      );

      if (!isAuthorized) {
        throw new Error('Unauthorized');
      }
    } catch (error) {
      request.log.error('Authorization failed', error);
      reply.status(403).send({
        message: 'Forbidden',
      });
    }
  };
};

// Fastify plugin to add the authorization middleware
export const authorizeMiddleware = fp(
  async (fastify) => {
    fastify.decorate('authorize', authorize);
  },
  {
    name: 'authorize',
    dependencies: ['authenticate'],
  }
);
