import { FastifyReply, FastifyRequest } from 'fastify';
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
    const cookie = request.cookies?.['ory_kratos_session'] as
      | string
      | undefined;
    const xSessionToken = request.headers['authorization']?.replace(
      /bearer /i,
      ''
    );
    if (!cookie && !xSessionToken) {
      throw new Error('No session cookie or token found');
    }

    const kratosClient = getKratosClient();
    const { data: session } = await kratosClient.toSession({
      ...(xSessionToken ? { xSessionToken } : {}),
      ...(cookie ? { cookie } : {}),
    });

    request.user = {
      id: session.identity?.id as string,
      email: session.identity?.traits?.email as string,
      displayName: session.identity?.traits?.display_name as string,
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
