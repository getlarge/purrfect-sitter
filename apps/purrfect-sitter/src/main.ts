import 'pino-pretty';
import 'pino';

import { createDatabase, closeDatabase } from '@purrfect-sitter/database';
import { app } from './app/app.js';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify from 'fastify';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

createDatabase();

const server = await Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  ajv: {
    customOptions: {
      removeAdditional: true,
    },
  },
}).withTypeProvider<TypeBoxTypeProvider>();

// TODO: validate environment variables, should throw if OPENFGA_STORE_ID not set
const appOptions = {
  kratosUrl: process.env.KRATOS_URL || 'http://localhost:4433',
  openfgaUrl: process.env.OPENFGA_URL || 'http://localhost:8080',
  openfgaStoreId: process.env.FGA_STORE_ID || '',
  authStrategy: (process.env.AUTH_STRATEGY || 'db') as 'db' | 'openfga',
};

await server.register(app, appOptions);

server.ready();

const shutdown = async () => {
  server.log.info('Shutting down server...');
  await server.close();
  await closeDatabase();

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen({ port, host }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  } else {
    console.log(`[ ready ] http://${host}:${port}`);
  }
});
