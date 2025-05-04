// @ts-check
//https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/esm-support.md
import { register } from 'node:module';

register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import type {
  ResourceDetectionConfig,
  ResourceDetector,
} from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { FastifyOtelInstrumentation } from '@fastify/otel';
import { DnsInstrumentation } from '@opentelemetry/instrumentation-dns';
import { NetInstrumentation } from '@opentelemetry/instrumentation-net';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

process.env.AUTH_STRATEGY ??= 'openfga';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

/**
 * @see https://github.com/open-telemetry/opentelemetry-js/issues/4638
 * @param detector
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function awaitAttributes(detector: ResourceDetector) {
  return {
    async detect(config?: ResourceDetectionConfig) {
      const resource = detector.detect(config);
      if (!resource.attributes) {
        return resource;
      }
      const promises = Object.values(resource.attributes).filter((value) => {
        return typeof value === 'object' && value !== null && 'then' in value;
      });
      await Promise.all(promises);
      return resource;
    },
  };
}

export const openTelemetrySdk = new NodeSDK({
  serviceName: `purrfect-sitter-${process.env.AUTH_STRATEGY}`,
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
  }),
  instrumentations: [
    new DnsInstrumentation(),
    new NetInstrumentation(),
    new HttpInstrumentation({
      enabled: true,
      headersToSpanAttributes: {
        server: {
          requestHeaders: [
            'x-benchmark-scenario',
            'x-benchmark-iteration', 
            'x-benchmark-run-id',
            'x-benchmark-expected-status'
          ],
          responseHeaders: []
        },
        client: {
          requestHeaders: [
            'x-benchmark-scenario',
            'x-benchmark-iteration', 
            'x-benchmark-run-id',
            'x-benchmark-expected-status'
          ],
          responseHeaders: []
        }
      }
    }),
    new FastifyOtelInstrumentation({
      registerOnInitialization: true,
      enabled: true,
    }),
    new PinoInstrumentation({}),
    new PgInstrumentation({ requireParentSpan: true }),
  ],
  // resourceDetectors: getResourceDetectors().map(
  //   awaitAttributes
  // ) as ResourceDetector[],
});

try {
  openTelemetrySdk.start();
  diag.info('OpenTelemetry automatic instrumentation started successfully');
} catch (error) {
  diag.error(
    'Error initializing OpenTelemetry SDK. The application is not instrumented and will not produce telemetry',
    error
  );
}

const shutdown = async () => {
  try {
    await openTelemetrySdk.shutdown();
    diag.debug('OpenTelemetry SDK terminated');
  } catch (error) {
    diag.error('Error terminating OpenTelemetry SDK', error);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.once('beforeExit', shutdown);
