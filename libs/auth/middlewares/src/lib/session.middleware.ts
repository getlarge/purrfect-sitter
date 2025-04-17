import { FastifyReply, FastifyRequest } from 'fastify';
import { userRepository } from '@purrfect-sitter/users-repositories';
import {
  getKratosClient,
  ISessionUser,
} from '@purrfect-sitter/auth-repositories';
import fp from 'fastify-plugin';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore all good
    const sessionCookie = request.cookies?.['ory_kratos_session'] as
      | string
      | undefined;
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
