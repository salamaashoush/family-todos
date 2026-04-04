import * as Sentry from "@sentry/react";

const dsn = typeof window !== "undefined"
  ? undefined // Client-side: initialized separately in TempsIntegration
  : process.env.SENTRY_DSN;

// Server-side init — only when SENTRY_DSN is set (auto-injected by Temps)
if (dsn && typeof window === "undefined") {
  Sentry.init({
    dsn,
    release: process.env.SENTRY_RELEASE,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
  });
}

export { Sentry };

export function captureException(error: unknown) {
  Sentry.captureException(error);
}

export function captureMessage(message: string) {
  Sentry.captureMessage(message);
}
