import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';

const requestUser = {
  id: randomUUID(),
  email: 'test@test.it',
  displayName: '',
};

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    request.user = requestUser;
  } catch (error) {
    request.log.error('Session validation failed', error);
    reply.status(401).send({
      error: 'Unauthorized',
    });
  }
}

// Fastify plugin to add the session middleware
export const sessionMiddleware = fp(
  async (fastify) => {
    fastify.decorateRequest('user', undefined);

    fastify.decorate('authenticate', authenticate);
  },
  {
    name: 'authenticate',
  }
);
