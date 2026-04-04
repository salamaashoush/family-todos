import { type ReactNode, useEffect, useRef } from 'react'
import { TempsAnalyticsProvider } from '@temps-sdk/react-analytics'
import * as Sentry from '@sentry/react'

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

function SentryInit({ dsn }: { dsn: string | null }) {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || !dsn) return
    initialized.current = true
    initSentry(dsn)
  }, [dsn])

  return null
}

export function TempsProviders({ sentryDsn, children }: { sentryDsn?: string | null; children: ReactNode }) {
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
      <SentryInit dsn={sentryDsn ?? null} />
      {children}
    </TempsAnalyticsProvider>
  )
}
