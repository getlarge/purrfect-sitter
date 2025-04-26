import * as path from 'node:path';
import { FastifyBaseLogger, FastifyInstance } from 'fastify';
import AutoLoad from '@fastify/autoload';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Server, IncomingMessage, ServerResponse } from 'node:http';
import { writeFileSync } from 'node:fs';

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

const __dirname = import.meta.dirname;

export async function app(fastify: Fastify, options: AppOptions) {
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: { ...options },
    forceESM: true,
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: { ...options },
    dirNameRoutePrefix: true,
    forceESM: true,
  });

  fastify.addHook('onReady', () => {
    if (process.env.NX_TASK_TARGET_TARGET === 'gen-openapi') {
      writeFileSync(
        path.join(import.meta.dirname, '..', '..', 'openapi.json'),
        JSON.stringify(fastify.swagger(), null, 2)
      );
      fastify.log.info('Generated OpenAPI spec');
      process.exit(0);
    }
  });
}
