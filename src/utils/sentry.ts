// Server-side Sentry init — only activates when SENTRY_DSN is set (auto-injected by Temps)
// On local dev without Temps, this is a no-op.

const dsn = process.env.SENTRY_DSN

let Sentry: typeof import('@sentry/bun') | null = null

if (dsn) {
  try {
    Sentry = require('@sentry/bun')
    Sentry.init({
      dsn,
      release: process.env.SENTRY_RELEASE,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
    })
  } catch {
    // @sentry/bun not available — skip
  }
}

export function captureException(error: unknown) {
  if (Sentry) {
    Sentry.captureException(error)
  }
}

export function captureMessage(message: string) {
  if (Sentry) {
    Sentry.captureMessage(message)
  }
}
