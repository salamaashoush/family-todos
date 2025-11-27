import pino from "pino";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const isDev = process.env.NODE_ENV !== "production";

// Create base logger
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: process.env.OTEL_SERVICE_NAME || "family-todos",
    env: process.env.NODE_ENV || "development",
  },
});

// Create child loggers for different modules
export function createLogger(module: string) {
  return logger.child({ module });
}

// Get current trace context for correlation
function getTraceContext() {
  const span = trace.getActiveSpan();
  if (!span) return {};

  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

// Enhanced logging with trace correlation
export const log = {
  info: (msg: string, data?: Record<string, unknown>) => {
    logger.info({ ...data, ...getTraceContext() }, msg);
  },
  error: (msg: string, error?: Error | unknown, data?: Record<string, unknown>) => {
    const errorData =
      error instanceof Error
        ? { error: { message: error.message, stack: error.stack, name: error.name } }
        : { error };
    logger.error({ ...data, ...errorData, ...getTraceContext() }, msg);

    // Also record error in active span
    const span = trace.getActiveSpan();
    if (span && error instanceof Error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    }
  },
  warn: (msg: string, data?: Record<string, unknown>) => {
    logger.warn({ ...data, ...getTraceContext() }, msg);
  },
  debug: (msg: string, data?: Record<string, unknown>) => {
    logger.debug({ ...data, ...getTraceContext() }, msg);
  },
};

// Request logging middleware helper
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  data?: Record<string, unknown>
) {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
  logger[level](
    {
      type: "http",
      method,
      path,
      statusCode,
      durationMs,
      ...data,
      ...getTraceContext(),
    },
    `${method} ${path} ${statusCode} ${durationMs}ms`
  );
}

// Create custom spans for important operations
export function withSpan<T>(
  name: string,
  fn: () => T | Promise<T>,
  attributes?: Record<string, string | number | boolean>
): T | Promise<T> {
  const tracer = trace.getTracer("family-todos");
  return tracer.startActiveSpan(name, (span) => {
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }

    try {
      const result = fn();
      if (result instanceof Promise) {
        return result
          .then((res) => {
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
            return res;
          })
          .catch((err) => {
            span.recordException(err);
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
            span.end();
            throw err;
          });
      }
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    } catch (err) {
      if (err instanceof Error) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      }
      span.end();
      throw err;
    }
  });
}

export default logger;
