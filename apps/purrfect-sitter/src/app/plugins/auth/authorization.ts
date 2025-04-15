import { FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { authorizeMiddleware } from '@purrfect-sitter/auth-middlewares';

// Plugin to register the authorization middleware
const authorizationPlugin: FastifyPluginAsync = async (fastify) => {
  // Register the authorization middleware
  fastify.register(authorizeMiddleware);

  // Add telemetry for measuring authorization performance
  fastify.addHook('onRequest', (request, reply, done) => {
    // Start measuring time
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

export default fastifyPlugin(authorizationPlugin, {
  name: 'authorization',
  fastify: '4.x',
  dependencies: ['session'],
});
