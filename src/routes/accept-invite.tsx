import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import {
  validateMemberInvite,
  acceptMemberInvite,
} from "../server/memberInvite";
import { Input, Button } from "../components/shared";
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/accept-invite")({
  validateSearch: searchSchema,
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const router = useRouter();
  const { token } = Route.useSearch();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const inviteQuery = useQuery({
    queryKey: ["memberInvite", token],
    queryFn: () => validateMemberInvite({ data: { token: token! } }),
    enabled: !!token && token.length === 64,
  });

  const acceptMutation = useMutation({
    mutationFn: acceptMemberInvite,
    onSuccess: async () => {
      await router.invalidate();
      router.navigate({ to: "/admin" });
    },
    onError: (error) => {
      if (error instanceof Error) {
        setFormErrors({ general: error.message });
      }
    },
  });

  const validateForm = (formData: FormData): boolean => {
    const errors: Record<string, string> = {};
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.username =
        "Username can only contain letters, numbers, underscores, and hyphens";
    }

    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(password)) {
      errors.password = "Password must contain at least one lowercase letter";
    } else if (!/[0-9]/.test(password)) {
      errors.password = "Password must contain at least one number";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!validateForm(formData)) {
      return;
    }

    acceptMutation.mutate({
      data: {
        token: token!,
        username: formData.get("username") as string,
        password: formData.get("password") as string,
      },
    });
  };

  // No token or invalid token length
  if (!token || token.length !== 64) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Invalid Invite Link
          </h1>
          <p className="text-gray-600 mb-6">
            This invite link appears to be invalid. Please check the link and
            try again.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-theme-primary hover:text-theme-secondary font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (inviteQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <Loader2 className="w-12 h-12 animate-spin text-theme-primary mx-auto mb-4" />
          <p className="text-gray-600">Validating invite...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired invite
  if (!inviteQuery.data?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Invite Expired or Used
          </h1>
          <p className="text-gray-600 mb-6">
            {inviteQuery.data?.message ||
              "This invite link is no longer valid. Please ask for a new invitation."}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-theme-primary hover:text-theme-secondary font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Valid invite - show account creation form
  const { email, memberName, familyName, role } = inviteQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            You're Invited!
          </h1>
          <p className="text-gray-600">
            Join <span className="font-semibold">{familyName}</span> as{" "}
            <span className="font-semibold">{memberName}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Role: <span className="capitalize">{role}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Email (from invitation)
            </label>
            <p className="text-gray-800 font-medium">{email}</p>
          </div>

          <div>
            <Input
              id="username"
              name="username"
              type="text"
              label="Choose a Username"
              required
              autoComplete="username"
              defaultValue={memberName?.toLowerCase().replace(/\s+/g, "")}
            />
            {formErrors.username && (
              <p className="mt-1 text-sm text-red-600">{formErrors.username}</p>
            )}
          </div>

          <div>
            <Input
              id="password"
              name="password"
              type="password"
              label="Create Password"
              required
              autoComplete="new-password"
            />
            {formErrors.password && (
              <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 8 characters with uppercase, lowercase, and
              number
            </p>
          </div>

          <div>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              required
              autoComplete="new-password"
            />
            {formErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {formErrors.confirmPassword}
              </p>
            )}
          </div>

          {(acceptMutation.error || formErrors.general) && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {formErrors.general ||
                (acceptMutation.error instanceof Error
                  ? acceptMutation.error.message
                  : "An error occurred. Please try again.")}
            </div>
          )}

          <Button
            type="submit"
            isLoading={acceptMutation.isPending}
            fullWidth
          >
            Create Account & Join Family
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
