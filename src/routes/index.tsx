import { createFileRoute, Link } from "@tanstack/react-router";
import { checkAuth } from "../server/auth";
import {
  CheckCircle,
  Users,
  Calendar,
  Trophy,
  ArrowRight,
  Share2,
  Shield,
  Sparkles,
  Heart,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async () => {
    // Check if user is logged in
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
      <header className="bg-white/95 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b-2 border-theme-primary/20">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-800">
                Family Todos
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link
                  to="/admin"
                  className="px-4 py-2 bg-theme-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 bg-theme-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center">
          {/* Free Badge */}
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            100% Free - No Credit Card Required
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Family Task Management
            <br />
            <span className="text-theme-primary">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Keep your family organized with shared task boards. Kids can check
            off their chores without needing an account - just share a link!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="px-8 py-4 bg-theme-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-lg flex items-center justify-center gap-2 shadow-lg shadow-theme-primary/25"
            >
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-lg border border-gray-200"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No setup fees. No hidden costs. Forever free for families.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          Everything You Need
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          A complete task management solution designed specifically for families
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Family Members"
            description="Add all family members with custom avatars and colors. Track individual progress and responsibilities."
          />
          <FeatureCard
            icon={<Calendar className="w-8 h-8" />}
            title="Flexible Time Slots"
            description="Organize tasks by time of day - morning routines, after school, evening chores, bedtime rituals."
          />
          <FeatureCard
            icon={<Share2 className="w-8 h-8" />}
            title="Shareable Boards"
            description="Share a private link with your family. Kids can check off tasks without creating accounts."
          />
          <FeatureCard
            icon={<CheckCircle className="w-8 h-8" />}
            title="One-Tap Check-off"
            description="Simple, kid-friendly interface. Tap to mark tasks complete from any phone, tablet, or computer."
          />
          <FeatureCard
            icon={<Trophy className="w-8 h-8" />}
            title="Achievements & Rewards"
            description="Motivate with badges, streaks, and points. Set up custom rewards for reaching goals."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Private & Secure"
            description="Your family data stays private. No ads, no tracking, no selling of your information."
          />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white/50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Create Your Family"
              description="Sign up and set up your family with members, time slots, and tasks"
            />
            <StepCard
              number="2"
              title="Share the Link"
              description="Get a private link that only your family can access - no accounts needed for kids"
            />
            <StepCard
              number="3"
              title="Track Progress"
              description="Watch as tasks get completed and celebrate achievements together"
            />
          </div>
        </div>
      </section>

      {/* Why Free Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-theme-primary/5 to-theme-secondary/5 rounded-3xl p-8 sm:p-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-6 h-6 text-red-500" />
            <h2 className="text-2xl font-bold text-gray-900">Why Is It Free?</h2>
          </div>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-8">
            Family Todos is a passion project built by parents who wanted a simple
            way to manage household tasks. We believe every family deserves access
            to good organization tools without worrying about subscription costs.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-700 font-medium">No Premium Tiers</p>
              <p className="text-xs text-gray-500">All features included</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm text-gray-700 font-medium">No Ads</p>
              <p className="text-xs text-gray-500">Clean, focused experience</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm text-gray-700 font-medium">Built with Love</p>
              <p className="text-xs text-gray-500">For families, by families</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Your Family Organized?
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Join families who use Family Todos to keep their household running
            smoothly. It takes less than a minute to set up.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-theme-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-lg shadow-lg shadow-theme-primary/25"
          >
            Create Your Free Family Board <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Free forever. No credit card needed.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <span className="text-lg font-semibold">Family Todos</span>
            </div>
            <p className="text-gray-400 text-sm">
              A free tool to help families stay organized
            </p>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            Made with care for families everywhere
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
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="w-14 h-14 bg-theme-primary/10 rounded-xl flex items-center justify-center text-theme-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-theme-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
