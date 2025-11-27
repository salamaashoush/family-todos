import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const OTEL_ENABLED = process.env.OTEL_ENABLED === "true";
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "family-todos";
const SERVICE_VERSION = process.env.npm_package_version || "1.0.0";
const ENVIRONMENT = process.env.NODE_ENV || "development";

let sdk: NodeSDK | null = null;

export function initTelemetry(): void {
  if (!OTEL_ENABLED) {
    console.log("[OTEL] Telemetry disabled (set OTEL_ENABLED=true to enable)");
    return;
  }

  if (!OTEL_ENDPOINT) {
    console.warn("[OTEL] OTEL_EXPORTER_OTLP_ENDPOINT not set, skipping telemetry");
    return;
  }

  console.log(`[OTEL] Initializing telemetry for ${SERVICE_NAME} -> ${OTEL_ENDPOINT}`);

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
    "deployment.environment": ENVIRONMENT,
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${OTEL_ENDPOINT}/v1/traces`,
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${OTEL_ENDPOINT}/v1/metrics`,
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30000, // Export metrics every 30 seconds
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable some noisy instrumentations
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log("[OTEL] Telemetry initialized successfully");

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[OTEL] Shutting down telemetry...");
    try {
      await sdk?.shutdown();
      console.log("[OTEL] Telemetry shut down successfully");
    } catch (err) {
      console.error("[OTEL] Error shutting down telemetry:", err);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export function getSDK(): NodeSDK | null {
  return sdk;
}

// Auto-initialize when this file is required/imported
initTelemetry();
