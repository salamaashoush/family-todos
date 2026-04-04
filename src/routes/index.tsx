import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { checkAuth, getCurrentFamilyShareToken } from "../server/auth";
import {
  CheckCircle,
  Users,
  Calendar,
  Trophy,
  Share2,
  Code,
} from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const auth = await checkAuth();

    // If user is authenticated with a family, redirect to their family board
    if (auth.authenticated && auth.currentFamilyId) {
      const { shareToken } = await getCurrentFamilyShareToken();

      if (shareToken) {
        throw redirect({
          to: "/family/$token",
          params: { token: shareToken },
        });
      }

      // Fallback to admin dashboard if no share token
      throw redirect({ to: "/admin" });
    }

    // Return context for loader to use
    return { isAuthenticated: auth.authenticated };
  },
  loader: async ({ context }) => {
    // Use the auth check result from beforeLoad if available, otherwise check again
    // This prevents double-checking auth when beforeLoad already ran
    return { isAuthenticated: (context as { isAuthenticated?: boolean })?.isAuthenticated ?? false };
  },
  component: LandingPage,
});

function LandingPage() {
  const { isAuthenticated } = Route.useLoaderData();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-800">
                Family Todos
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://github.com/salamaashoush/family-todos"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="View on GitHub"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              </a>
              {isAuthenticated ? (
                <Link
                  to="/admin"
                  className="px-4 py-2 bg-theme-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3 py-2 text-gray-600 text-sm font-medium hover:text-gray-900 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 bg-theme-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Simple task management for families
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              An open-source app to organize household chores and routines.
              Share a link with your family - kids can check off tasks without needing accounts.
            </p>
            {!isAuthenticated && (
              <Link
                to="/signup"
                className="inline-flex px-6 py-3 bg-theme-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity shadow-sm"
              >
                Get Started
              </Link>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="Family Members"
              description="Add members with avatars and track individual progress"
            />
            <FeatureCard
              icon={<Calendar className="w-5 h-5" />}
              title="Time Slots"
              description="Organize by morning, afternoon, evening, or custom schedules"
            />
            <FeatureCard
              icon={<Share2 className="w-5 h-5" />}
              title="Shareable Links"
              description="Private links let family access without creating accounts"
            />
            <FeatureCard
              icon={<CheckCircle className="w-5 h-5" />}
              title="Simple Check-off"
              description="Tap to complete - works on any device"
            />
            <FeatureCard
              icon={<Trophy className="w-5 h-5" />}
              title="Points & Rewards"
              description="Earn points for tasks, redeem for custom rewards"
            />
            <FeatureCard
              icon={<Code className="w-5 h-5" />}
              title="Open Source"
              description="Self-host it, modify it, contribute to it"
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <span>Family Todos - Open source task management</span>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/salamaashoush/family-todos"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                Source Code
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 hover:border-gray-300/50 transition-colors">
      <div className="w-9 h-9 bg-theme-primary/10 rounded-lg flex items-center justify-center text-theme-primary mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
