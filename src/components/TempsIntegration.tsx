import type { ReactNode } from 'react'
import { TempsAnalyticsProvider } from '@temps-sdk/react-analytics'

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
      {children}
    </TempsAnalyticsProvider>
  )
}
