import { type ReactNode, useEffect, useRef } from 'react'
import { TempsAnalyticsProvider } from '@temps-sdk/react-analytics'
import * as Sentry from '@sentry/react'

// Client-side Sentry init — runs once
let sentryInitialized = false

function initSentry(dsn: string) {
  if (sentryInitialized || typeof window === 'undefined') return
  sentryInitialized = true

  Sentry.init({
    dsn,
    environment: 'production',
    integrations: [Sentry.replayIntegration()],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}

function SentryInit() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Read DSN from meta tag injected by server, or use auto-injected env var
    const meta = document.querySelector('meta[name="sentry-dsn"]')
    const dsn = meta?.getAttribute('content')
    if (dsn) {
      initSentry(dsn)
    }
  }, [])

  return null
}

export function TempsProviders({ children }: { children: ReactNode }) {
  return (
    <TempsAnalyticsProvider
      basePath="/api/_temps"
      autoTrack={{
        pageviews: true,
        pageLeave: true,
        speedAnalytics: true,
        engagement: true,
      }}
    >
      <SentryInit />
      {children}
    </TempsAnalyticsProvider>
  )
}
