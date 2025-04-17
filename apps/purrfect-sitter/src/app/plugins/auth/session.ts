import { fastifyCookie } from '@fastify/cookie';
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { sessionMiddleware } from '@purrfect-sitter/auth-middlewares';

const sessionPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(fastifyCookie, {});

  fastify.register(sessionMiddleware);

  // Add decorator for routes that need authentication
  fastify.decorate(
    'requireAuth',
    function (
      request: FastifyRequest,
      reply: FastifyReply,
      done: (err?: Error) => void
    ) {
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      done();
    }
  );
};

export default fp(sessionPlugin, {
  name: 'session',
  fastify: '4.x',
});
