import * as path from 'node:path';
import { FastifyBaseLogger, FastifyInstance } from 'fastify';
import AutoLoad from '@fastify/autoload';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Server, IncomingMessage, ServerResponse } from 'node:http';

export interface AppOptions {
  kratosUrl: string;
  openfgaUrl: string;
  openfgaStoreId: string;
  authStrategy: 'db' | 'openfga';
}

type Fastify = FastifyInstance<
  Server<typeof IncomingMessage, typeof ServerResponse>,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export async function app(fastify: Fastify, opts: AppOptions) {
  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: { ...opts },
    forceESM: true,
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    prefix: '/api',
    options: { ...opts },
    forceESM: true,
  });

  // Generate Swagger documentation on startup
  fastify.ready(() => {
    fastify.swagger();
  });
}
