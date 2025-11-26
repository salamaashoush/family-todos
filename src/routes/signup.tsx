import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { signUp } from "../server/signup";
import { Input, Button } from "../components/shared";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  const router = useRouter();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const signUpMutation = useMutation({
    mutationFn: signUp,
    onSuccess: async () => {
      await router.invalidate();
      router.navigate({ to: "/onboarding" });
    },
    onError: (error) => {
      if (error instanceof Error) {
        if (error.message.includes("Username or email already exists")) {
          setFormErrors({
            general: "Username or email already exists. Please try different credentials.",
          });
        }
      }
    },
  });

  const validateForm = (formData: FormData): boolean => {
    const errors: Record<string, string> = {};
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.username = "Username can only contain letters, numbers, underscores, and hyphens";
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
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

    signUpMutation.mutate({
      data: {
        username: formData.get("username") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h1>
          <p className="text-gray-600">Sign up to start managing your family tasks</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Input
              id="username"
              name="username"
              type="text"
              label="Username"
              required
              autoComplete="username"
            />
            {formErrors.username && (
              <p className="mt-1 text-sm text-red-600">{formErrors.username}</p>
            )}
          </div>

          <div>
            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              required
              autoComplete="email"
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
            )}
          </div>

          <div>
            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              required
              autoComplete="new-password"
            />
            {formErrors.password && (
              <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 8 characters with uppercase, lowercase, and number
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
              <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
            )}
          </div>

          {(signUpMutation.error || formErrors.general) && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {formErrors.general ||
                (signUpMutation.error instanceof Error
                  ? signUpMutation.error.message
                  : "An error occurred. Please try again.")}
            </div>
          )}

          <Button type="submit" isLoading={signUpMutation.isPending} fullWidth>
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-theme-primary hover:text-theme-secondary font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
          <button
            onClick={() => router.navigate({ to: "/" })}
            className="text-gray-500 hover:text-gray-700 text-sm transition-colors focus:outline-none"
            type="button"
          >
            Back to Family Board
          </button>
        </div>
      </div>
    </div>
  );
}
