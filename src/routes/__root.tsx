import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type { QueryClient } from '@tanstack/react-query'
import appCss from '../styles.css?url'
import { ThemeProvider } from 'next-themes'
import { LayoutProvider } from '../contexts/LayoutContext'

// Content Security Policy for production
// Restricts sources for scripts, styles, images, etc.
const getCSPContent = () => {
  const isDev = process.env.NODE_ENV === 'development'

  // More permissive in development for hot reload, devtools, etc.
  if (isDev) {
    return "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; worker-src 'self' blob:;"
  }

  // Production CSP - 'unsafe-inline' required for TanStack Start hydration scripts
  // worker-src blob: needed for canvas-confetti
  return "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' wss:; worker-src 'self' blob:; frame-ancestors 'none'; form-action 'self'; base-uri 'self';"
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
      },
      {
        title: 'Family Todos',
      },
      // PWA meta tags
      {
        name: 'description',
        content: 'A family task management app to organize and track household chores and responsibilities',
      },
      {
        name: 'theme-color',
        content: '#8B5CF6',
      },
      {
        name: 'application-name',
        content: 'Family Todos',
      },
      // iOS specific
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'Family Todos',
      },
      // Microsoft specific
      {
        name: 'msapplication-TileColor',
        content: '#8B5CF6',
      },
      {
        name: 'msapplication-TileImage',
        content: '/icon-144.png',
      },
      // Android specific
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      // Security headers via meta tags
      // Note: X-Frame-Options and X-Content-Type-Options must be set via HTTP headers, not meta tags
      // CSP frame-ancestors directive provides equivalent protection to X-Frame-Options
      {
        httpEquiv: 'Content-Security-Policy',
        content: getCSPContent(),
      },
      {
        httpEquiv: 'Referrer-Policy',
        content: 'strict-origin-when-cross-origin',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      // PWA manifest
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      // Favicon
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/icon-32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/icon-16.png',
      },
      // Apple touch icons
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '152x152',
        href: '/icon-152.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '167x167',
        href: '/icon-167.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/icon-180.png',
      },
      // Apple splash screens would go here for iOS
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function NotFoundComponent() {
  return (
    <RootDocument>
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Page Not Found</h1>
          <p className="text-gray-600 mb-8">The page you're looking for doesn't exist or has been moved.</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-theme-primary to-theme-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Go Home
          </Link>
        </div>
      </div>
    </RootDocument>
  )
}

function ErrorComponent({ error }: { error: Error }) {
  const router = useRouter()

  // Parse error message to provide user-friendly feedback
  const getErrorInfo = () => {
    const message = error?.message || ''

    // Check for common error patterns
    if (message.includes('Invalid token') || message.includes('too_big') || message.includes('too_small')) {
      return {
        title: 'Invalid Link',
        description: 'This link appears to be invalid or malformed. Please check the URL and try again.',
        icon: (
          <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        ),
      }
    }

    if (message.includes('Not authenticated') || message.includes('Unauthorized')) {
      return {
        title: 'Access Denied',
        description: 'You need to be logged in to access this page.',
        icon: (
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ),
        showLogin: true,
      }
    }

    if (message.includes('not found') || message.includes('Not found')) {
      return {
        title: 'Not Found',
        description: 'The resource you\'re looking for could not be found.',
        icon: (
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        ),
      }
    }

    // Default error
    return {
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred. Please try again later.',
      icon: (
        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    }
  }

  const errorInfo = getErrorInfo()

  return (
    <RootDocument>
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            {errorInfo.icon}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">{errorInfo.title}</h1>
          <p className="text-gray-600 mb-8">{errorInfo.description}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.history.back()}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Go Back
            </button>
            {errorInfo.showLogin ? (
              <Link
                to="/login"
                className="px-6 py-3 bg-gradient-to-r from-theme-primary to-theme-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Sign In
              </Link>
            ) : (
              <Link
                to="/"
                className="px-6 py-3 bg-gradient-to-r from-theme-primary to-theme-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Go Home
              </Link>
            )}
          </div>
        </div>
      </div>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="default"
          themes={['default', 'ocean', 'sunset', 'forest', 'candy']}
          disableTransitionOnChange
        >
          <LayoutProvider>
            {children}
          </LayoutProvider>
        </ThemeProvider>
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-left" />
        <Scripts />
      </body>
    </html>
  )
}
