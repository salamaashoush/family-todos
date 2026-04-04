// Re-export Sentry for server-side usage (captureException, etc.)
// Client-side init happens in TempsIntegration.tsx via @sentry/react
import * as Sentry from "@sentry/react";

export { Sentry };

export function captureException(error: unknown) {
  Sentry.captureException(error);
}

export function captureMessage(message: string) {
  Sentry.captureMessage(message);
}
