import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

export const openTelemetrySdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-dns': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-net': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-fastify': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-pino': {
        enabled: true,
      },
      // TODO: check https://github.com/openfga/js-sdk/tree/main/example/opentelemetry for OpenFGA Telemetry
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
    }),
  ],
});

openTelemetrySdk.start();

const shutdown = async () => {
  await openTelemetrySdk.shutdown();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
