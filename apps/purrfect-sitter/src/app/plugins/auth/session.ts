import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { sessionMiddleware } from '@purrfect-sitter/auth-middlewares';

// Plugin to register the session middleware
const sessionPlugin: FastifyPluginAsync = async (fastify) => {
  // Register the session middleware
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

export default fastifyPlugin(sessionPlugin, {
  name: 'session',
  fastify: '4.x',
});
