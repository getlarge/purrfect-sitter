import { app } from './app/app.js';
import {
  TypeBoxTypeProvider,
  TypeBoxValidatorCompiler,
} from '@fastify/type-provider-typebox';
import { createDatabase, closeDatabase } from '@purrfect-sitter/database';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import Fastify from 'fastify';

// Set up OpenTelemetry diagnostics logging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Initialize OpenTelemetry for performance monitoring
const openTelemetrySdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fastify': {
        enabled: true,
      },
      // TODO: check https://github.com/openfga/js-sdk/tree/main/example/opentelemetry for OpenFGA Telemetry
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
    }),
  ],
});

// Start OpenTelemetry
openTelemetrySdk.start();

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// Initialize database connection
createDatabase();

// Instantiate Fastify with some config
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

// App options with configuration values
const appOptions = {
  // Auth configuration
  kratosUrl: process.env.KRATOS_URL || 'http://localhost:4433',
  openfgaUrl: process.env.OPENFGA_URL || 'http://localhost:8080',
  openfgaStoreId: process.env.OPENFGA_STORE_ID || '',
  authStrategy: (process.env.AUTH_STRATEGY || 'db') as 'db' | 'openfga',
};

// Register your application as a normal plugin.
server.register(app, appOptions);

// Graceful shutdown
const shutdown = async () => {
  server.log.info('Shutting down server...');
  await server.close();
  await closeDatabase();

  // Shutdown OpenTelemetry
  await openTelemetrySdk.shutdown();

  process.exit(0);
};

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start listening.
server.listen({ port, host }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  } else {
    console.log(`[ ready ] http://${host}:${port}`);
  }
});
