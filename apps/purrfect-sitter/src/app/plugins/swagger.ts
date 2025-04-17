import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default fp(async function (fastify: FastifyInstance) {
await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Purrfect Sitter API',
        description: 'API for managing cat sittings',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'ory_kratos_session',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
  });
});
