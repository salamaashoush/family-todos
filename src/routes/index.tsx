import { createFileRoute, Link } from "@tanstack/react-router";
import { checkAuth } from "../server/auth";
import {
  CheckCircle,
  Users,
  Calendar,
  Trophy,
  Share2,
  Github,
} from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async () => {
    const auth = await checkAuth();
    return { isAuthenticated: auth.authenticated };
  },
  component: LandingPage,
});

function LandingPage() {
  const { isAuthenticated } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-40">
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

            <div className="flex items-center gap-3">
              <a
                href="https://github.com/sashoush/family-todos"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="View on GitHub"
              >
                <Github className="w-5 h-5" />
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

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Simple task management for families
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            An open-source app to organize household chores and routines.
            Share a link with your family - kids can check off tasks without needing accounts.
          </p>
          {!isAuthenticated && (
            <Link
              to="/signup"
              className="inline-flex px-6 py-3 bg-theme-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Family Members"
            description="Add members with avatars and track individual progress"
          />
          <FeatureCard
            icon={<Calendar className="w-6 h-6" />}
            title="Time Slots"
            description="Organize by morning, afternoon, evening, or custom schedules"
          />
          <FeatureCard
            icon={<Share2 className="w-6 h-6" />}
            title="Shareable Links"
            description="Private links let family access without creating accounts"
          />
          <FeatureCard
            icon={<CheckCircle className="w-6 h-6" />}
            title="Simple Check-off"
            description="Tap to complete - works on any device"
          />
          <FeatureCard
            icon={<Trophy className="w-6 h-6" />}
            title="Points & Rewards"
            description="Earn points for tasks, redeem for custom rewards"
          />
          <FeatureCard
            icon={<Github className="w-6 h-6" />}
            title="Open Source"
            description="Self-host it, modify it, contribute to it"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Family Todos</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a
                href="https://github.com/sashoush/family-todos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
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
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="w-10 h-10 bg-theme-primary/10 rounded-lg flex items-center justify-center text-theme-primary mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
