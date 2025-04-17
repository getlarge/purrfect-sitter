import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { authorizeMiddleware } from '@purrfect-sitter/auth-middlewares';

const authorizationPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(authorizeMiddleware);

  // Add telemetry for measuring authorization performance
  fastify.addHook('onRequest', (request, reply, done) => {
    request.authStartTime = performance.now();
    done();
  });

  fastify.addHook('onResponse', (request, reply, done) => {
    // If authorization was performed, log the time it took
    if (request.authStartTime) {
      const authEndTime = performance.now();
      request.log.info(
        {
          authDuration: authEndTime - request.authStartTime,
          path: request.url,
          method: request.method,
          status: reply.statusCode,
        },
        'Authorization performance'
      );
    }
    done();
  });
};

// Add TypeScript declaration for the authStartTime property
declare module 'fastify' {
  interface FastifyRequest {
    authStartTime?: number;
  }
}

export default fp(authorizationPlugin, {
  name: 'authorization',
  fastify: '5.x',
  dependencies: ['session'],
});
