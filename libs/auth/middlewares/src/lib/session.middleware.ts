import { FastifyReply, FastifyRequest } from 'fastify';
import { userRepository } from '@purrfect-sitter/users-repositories';
import {
  getKratosClient,
  ISessionUser,
} from '@purrfect-sitter/auth-repositories';
import fp from 'fastify-plugin';

// Session hook to validate the user's session using Kratos
export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const sessionCookie = request.cookies?.['ory_kratos_session'];

    if (!sessionCookie) {
      throw new Error('No session cookie found');
    }

    const kratosClient = getKratosClient();
    const { data: session } = await kratosClient.toSession({
      cookie: sessionCookie,
    });

    const userId = session.identity?.metadata_public?.id;
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Add user to request for use in handlers
    request.user = {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? undefined,
    } satisfies ISessionUser;
  } catch (error) {
    request.log.error('Session validation failed', error);
    reply.status(401).send({
      message: 'Unauthorized',
    });
  }
};

declare module 'fastify' {
  interface FastifyRequest {
    // should not be needed, because we are using @fastify/cookie
    cookies?: Record<string, string>;
    user?: ISessionUser;
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
