import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { validateResetToken, resetPassword } from "../server/passwordReset";
import { Input, Button } from "../components/shared";
import { Lock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const { token } = Route.useSearch();

  // Validate token on mount
  const tokenQuery = useQuery({
    queryKey: ["reset-token", token],
    queryFn: () => validateResetToken({ data: { token: token || "" } }),
    enabled: !!token && token.length === 64,
    retry: false,
  });

  const resetMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.navigate({ to: "/login" });
      }, 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      return;
    }

    resetMutation.mutate({
      data: {
        token: token || "",
        password,
      },
    });
  };

  // No token provided
  if (!token || token.length !== 64) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-6 py-3 bg-theme-primary hover:bg-theme-secondary text-white font-semibold rounded-xl transition-colors"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  // Loading token validation
  if (tokenQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-theme-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Token invalid or expired
  if (!tokenQuery.data?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Link Expired</h1>
          <p className="text-gray-600 mb-6">
            This password reset link has expired. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-6 py-3 bg-theme-primary hover:bg-theme-secondary text-white font-semibold rounded-xl transition-colors"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  // Success message
  if (resetMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Password Reset!</h1>
          <p className="text-gray-600 mb-6">
            Your password has been successfully reset. Redirecting to login...
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-theme-primary hover:text-theme-secondary font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Reset Password</h1>
          <p className="text-gray-600">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            id="password"
            name="password"
            type="password"
            label="New Password"
            required
            minLength={8}
            autoComplete="new-password"
          />

          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm Password"
            required
            minLength={8}
            autoComplete="new-password"
          />

          <div className="text-sm text-gray-500">
            Password must be at least 8 characters and include uppercase,
            lowercase, and a number.
          </div>

          {resetMutation.error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {resetMutation.error instanceof Error
                ? resetMutation.error.message
                : "An error occurred"}
            </div>
          )}

          <Button type="submit" isLoading={resetMutation.isPending} fullWidth>
            Reset Password
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
