import { openTelemetrySdk } from './otel.js';

import { createDatabase, closeDatabase } from '@purrfect-sitter/database';
import { app } from './app/app.js';
import {
  TypeBoxTypeProvider,
  TypeBoxValidatorCompiler,
} from '@fastify/type-provider-typebox';
import Fastify from 'fastify';
import { configureAuth } from '@purrfect-sitter/auth-repositories';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

createDatabase();

const server = Fastify({
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
})
  .setValidatorCompiler(TypeBoxValidatorCompiler)
  .withTypeProvider<TypeBoxTypeProvider>();

// TODO: validate environment variables
const appOptions = {
  kratosUrl: process.env.KRATOS_URL || 'http://localhost:4433',
  openfgaUrl: process.env.OPENFGA_URL || 'http://localhost:8080',
  openfgaStoreId: process.env.OPENFGA_STORE_ID || '',
  authStrategy: (process.env.AUTH_STRATEGY || 'db') as 'db' | 'openfga',
};

configureAuth({
  kratosUrl: appOptions.kratosUrl,
  openfgaUrl: appOptions.openfgaUrl,
  openfgaStoreId: appOptions.openfgaStoreId,
  authStrategy: appOptions.authStrategy,
});

server.register(app, appOptions);

const shutdown = async () => {
  server.log.info('Shutting down server...');
  await server.close();
  await closeDatabase();

  await openTelemetrySdk.shutdown();

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
