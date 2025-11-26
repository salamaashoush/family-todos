import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getAccountStatus } from "../server/auth";
import { Clock, Ban, XCircle, LogOut } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../server/auth";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/account-status")({
  loader: async () => {
    const result = await getAccountStatus();

    // If not authenticated, redirect to login
    if (!result.authenticated) {
      throw redirect({ to: "/login" });
    }

    // If account is active, redirect to admin
    if (result.accountStatus === "active") {
      throw redirect({ to: "/admin" });
    }

    return {
      username: result.username,
      accountStatus: result.accountStatus,
    };
  },
  component: AccountStatusPage,
});

function AccountStatusPage() {
  const { username, accountStatus } = Route.useLoaderData();
  const router = useRouter();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await router.invalidate();
      router.navigate({ to: "/" });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        {accountStatus === "pending" && (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Account Pending Approval
            </h1>
            <p className="text-gray-600 mb-6">
              Hi <strong>{username}</strong>, your account is currently pending
              approval.
            </p>
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-yellow-700">
                An administrator will review your application and activate your
                account shortly. You'll be able to access the dashboard once
                your account has been approved.
              </p>
            </div>
          </>
        )}

        {accountStatus === "suspended" && (
          <>
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Ban className="w-10 h-10 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Account Suspended
            </h1>
            <p className="text-gray-600 mb-6">
              Hi <strong>{username}</strong>, your account has been suspended.
            </p>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-orange-700">
                Your account access has been temporarily suspended. Please
                contact support if you believe this is an error or need
                assistance.
              </p>
            </div>
          </>
        )}

        {accountStatus === "rejected" && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Application Not Approved
            </h1>
            <p className="text-gray-600 mb-6">
              Hi <strong>{username}</strong>, your account application was not
              approved.
            </p>
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-red-700">
                Unfortunately, your account application was not approved. Please
                contact support if you believe this is an error.
              </p>
            </div>
          </>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <Link
            to="/"
            className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
