import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  checkVerificationToken,
  verifyEmail,
  resendVerificationEmail,
} from "../server/emailVerification";
import { Button, Input } from "../components/shared";
import { Mail, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { useState } from "react";

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/verify-email")({
  validateSearch: searchSchema,
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const router = useRouter();
  const { token } = Route.useSearch();
  const [resendEmail, setResendEmail] = useState("");

  // If token is provided, validate and verify
  const tokenQuery = useQuery({
    queryKey: ["verify-token", token],
    queryFn: () => checkVerificationToken({ data: { token: token || "" } }),
    enabled: !!token && token.length === 64,
    retry: false,
  });

  const verifyMutation = useMutation({
    mutationFn: verifyEmail,
  });

  const resendMutation = useMutation({
    mutationFn: resendVerificationEmail,
  });

  // Auto-verify when token is valid
  if (token && tokenQuery.data?.valid && !verifyMutation.isSuccess && !verifyMutation.isPending) {
    verifyMutation.mutate({ data: { token } });
  }

  // Successfully verified
  if (verifyMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Email Verified!</h1>
          <p className="text-gray-600 mb-6">
            Your email has been successfully verified. You can now continue setting up your account.
          </p>
          <Button onClick={() => router.navigate({ to: "/onboarding" })} fullWidth>
            Continue to Setup <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Invalid or expired token
  if (token && (tokenQuery.isError || (tokenQuery.data && !tokenQuery.data.valid))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Link Expired</h1>
            <p className="text-gray-600">
              This verification link has expired or is invalid. Enter your email to receive a new one.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              resendMutation.mutate({ data: { email: resendEmail } });
            }}
            className="space-y-4"
          >
            <Input
              id="email"
              name="email"
              type="email"
              label="Email Address"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              required
            />

            {resendMutation.isSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                If your email is registered and unverified, you will receive a new verification link.
              </div>
            )}

            <Button type="submit" isLoading={resendMutation.isPending} fullWidth>
              Resend Verification Email
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (token && tokenQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-theme-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  // Verifying
  if (verifyMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-theme-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  // No token - show resend form
  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Email</h1>
          <p className="text-gray-600">
            Enter your email address to receive a verification link.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            resendMutation.mutate({ data: { email: resendEmail } });
          }}
          className="space-y-4"
        >
          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            required
          />

          {resendMutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
              If your email is registered and unverified, you will receive a verification link.
            </div>
          )}

          <Button type="submit" isLoading={resendMutation.isPending} fullWidth>
            Send Verification Email
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
