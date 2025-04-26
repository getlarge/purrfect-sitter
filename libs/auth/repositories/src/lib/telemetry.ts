import {
  TelemetryAttribute,
  TelemetryConfig,
  TelemetryMetric,
} from '@openfga/sdk';

export const telemetryConfig = {
  metrics: {
    [TelemetryMetric.CounterCredentialsRequest]: {
      attributes: new Set([
        TelemetryAttribute.UrlScheme,
        TelemetryAttribute.UserAgentOriginal,
        TelemetryAttribute.HttpRequestMethod,
        TelemetryAttribute.FgaClientRequestClientId,
        TelemetryAttribute.FgaClientRequestStoreId,
        TelemetryAttribute.FgaClientRequestModelId,
        TelemetryAttribute.HttpRequestResendCount,
      ]),
    },
    [TelemetryMetric.HistogramRequestDuration]: {
      attributes: new Set([
        TelemetryAttribute.HttpResponseStatusCode,
        TelemetryAttribute.UserAgentOriginal,
        TelemetryAttribute.FgaClientRequestMethod,
        TelemetryAttribute.FgaClientRequestClientId,
        TelemetryAttribute.FgaClientRequestStoreId,
        TelemetryAttribute.FgaClientRequestModelId,
        TelemetryAttribute.HttpRequestResendCount,
      ]),
    },
    [TelemetryMetric.HistogramQueryDuration]: {
      attributes: new Set([
        TelemetryAttribute.FgaClientRequestBatchCheckSize,
        TelemetryAttribute.HttpResponseStatusCode,
        TelemetryAttribute.UserAgentOriginal,
        TelemetryAttribute.FgaClientRequestMethod,
        TelemetryAttribute.FgaClientRequestClientId,
        TelemetryAttribute.FgaClientRequestStoreId,
        TelemetryAttribute.FgaClientRequestModelId,
        TelemetryAttribute.HttpRequestResendCount,
      ]),
    },
  },
} satisfies TelemetryConfig;
