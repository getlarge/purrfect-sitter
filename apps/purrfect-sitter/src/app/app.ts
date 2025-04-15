import * as path from 'node:path';
import { FastifyInstance } from 'fastify';
import { fastifyCookie } from '@fastify/cookie';
import AutoLoad from '@fastify/autoload';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export interface AppOptions {
  // Authentication configuration
  kratosUrl: string;
  openfgaUrl: string;
  openfgaStoreId: string;
  authStrategy: 'db' | 'openfga';
}

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  fastify.register(fastifyCookie, {});

  // Register Swagger for API documentation
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

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: { ...opts },
    forceESM: true, // Ensure ESM support
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: { ...opts },
    forceESM: true, // Ensure ESM support
  });

  // Generate Swagger documentation on startup
  fastify.ready(() => {
    fastify.swagger();
  });
}
