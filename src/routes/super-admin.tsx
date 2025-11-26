import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { checkAuth } from "../server/auth";
import {
  checkSuperAdmin,
  checkDefaultAdminSecurity,
  getSuperAdminStats,
  getUsers,
  updateUserStatus,
  getUserDetails,
  deleteUser,
} from "../server/superAdmin";
import { Toast, showToast } from "../components/Toast";
import { Button } from "../components/shared";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Home,
  LogOut,
  Eye,
  UserCheck,
  UserX,
  Trash2,
  X,
  Key,
} from "lucide-react";
import { logout } from "../server/auth";

const searchSchema = z.object({
  page: z.number().optional().default(1),
  status: z.enum(["all", "pending", "active", "suspended", "rejected"]).optional().default("all"),
  search: z.string().optional(),
});

export const Route = createFileRoute("/super-admin")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const auth = await checkAuth();
    if (!auth.authenticated) {
      throw redirect({ to: "/login" });
    }

    const { isSuperAdmin } = await checkSuperAdmin();
    if (!isSuperAdmin) {
      throw redirect({ to: "/admin" });
    }

    return { username: auth.username };
  },
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ["super-admin-stats"],
        queryFn: () => getSuperAdminStats(),
      }),
      queryClient.ensureQueryData({
        queryKey: ["super-admin-users", { page: 1, status: "all", search: "" }],
        queryFn: () => getUsers({ data: { page: 1, limit: 20, status: "all" } }),
      }),
      queryClient.ensureQueryData({
        queryKey: ["default-admin-security"],
        queryFn: () => checkDefaultAdminSecurity(),
      }),
    ]);
  },
  component: SuperAdminDashboard,
});

type StatusFilter = "all" | "pending" | "active" | "suspended" | "rejected";

function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [searchTerm, setSearchTerm] = useState(search.search || "");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: () => getSuperAdminStats(),
  });

  // Security check query
  const { data: securityCheck } = useQuery({
    queryKey: ["default-admin-security"],
    queryFn: () => checkDefaultAdminSecurity(),
  });

  // Users query
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["super-admin-users", { page: search.page, status: search.status, search: search.search }],
    queryFn: () =>
      getUsers({
        data: {
          page: search.page || 1,
          limit: 20,
          status: search.status || "all",
          search: search.search,
        },
      }),
  });

  // User details query
  const { data: userDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["super-admin-user-details", selectedUserId],
    queryFn: () => getUserDetails({ data: { userId: selectedUserId! } }),
    enabled: !!selectedUserId,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: updateUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-user-details"] });
      showToast("User status updated", "success");
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to update status", "error");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-stats"] });
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setSelectedUserId(null);
      showToast("User deleted", "success");
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to delete user", "error");
    },
  });

  const handleStatusChange = useCallback(
    (userId: number, status: "pending" | "active" | "suspended" | "rejected", notes?: string) => {
      updateStatusMutation.mutate({ data: { userId, status, notes } });
    },
    [updateStatusMutation]
  );

  const handleSearch = useCallback(() => {
    navigate({
      search: { ...search, page: 1, search: searchTerm || undefined },
    });
  }, [navigate, search, searchTerm]);

  const handleStatusFilter = useCallback(
    (status: StatusFilter) => {
      navigate({
        search: { ...search, page: 1, status },
      });
    },
    [navigate, search]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      navigate({
        search: { ...search, page },
      });
    },
    [navigate, search]
  );

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: <Clock className="w-3 h-3" /> },
      active: { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle className="w-3 h-3" /> },
      suspended: { bg: "bg-orange-100", text: "text-orange-700", icon: <AlertCircle className="w-3 h-3" /> },
      rejected: { bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="w-3 h-3" /> },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toast />

      {/* Security Warning Banner */}
      {securityCheck?.needsPasswordChange && (
        <div className="bg-red-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Security Warning: Default Admin Password Not Changed</p>
              <p className="text-sm text-red-100">
                The default admin account "{securityCheck.defaultAdminUsername}" is using the default password.
                Please change it immediately in the Security tab of your admin dashboard.
              </p>
            </div>
            <Link
              to="/admin"
              search={{ tab: "security" }}
              className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition-colors"
            >
              <Key className="w-4 h-4" />
              Change Password
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Super Admin</h1>
                <p className="text-xs text-gray-400">Internal Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                title="Go to main site"
              >
                <Home className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            label="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={<Users className="w-5 h-5 text-blue-600" />}
            color="blue"
          />
          <StatCard
            label="Pending"
            value={stats?.pendingUsers ?? 0}
            icon={<Clock className="w-5 h-5 text-yellow-600" />}
            color="yellow"
            highlight={stats?.pendingUsers ? stats.pendingUsers > 0 : false}
          />
          <StatCard
            label="Active"
            value={stats?.activeUsers ?? 0}
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            color="green"
          />
          <StatCard
            label="Suspended"
            value={stats?.suspendedUsers ?? 0}
            icon={<AlertCircle className="w-5 h-5 text-orange-600" />}
            color="orange"
          />
          <StatCard
            label="Families"
            value={stats?.totalFamilies ?? 0}
            icon={<Home className="w-5 h-5 text-purple-600" />}
            color="purple"
          />
          <StatCard
            label="This Week"
            value={stats?.recentSignups ?? 0}
            icon={<Users className="w-5 h-5 text-indigo-600" />}
            color="indigo"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["all", "pending", "active", "suspended", "rejected"] as StatusFilter[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      search.status === status
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                    {status === "pending" && stats?.pendingUsers ? (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-500 text-white rounded-full text-xs">
                        {stats.pendingUsers}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by username or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <Button onClick={handleSearch}>Search</Button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              {usersLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : usersData?.users.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No users found</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {usersData?.users.map((user) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-gray-50 cursor-pointer ${selectedUserId === user.id ? "bg-purple-50" : ""}`}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{user.username}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(user.accountStatus)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserId(user.id);
                              }}
                              className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {user.accountStatus === "pending" && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(user.id, "active");
                                  }}
                                  className="p-1.5 rounded hover:bg-green-100 text-green-600"
                                  title="Approve"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(user.id, "rejected");
                                  }}
                                  className="p-1.5 rounded hover:bg-red-100 text-red-600"
                                  title="Reject"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {usersData && usersData.pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Page {usersData.pagination.page} of {usersData.pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(usersData.pagination.page - 1)}
                    disabled={usersData.pagination.page === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(usersData.pagination.page + 1)}
                    disabled={usersData.pagination.page === usersData.pagination.totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Details Panel */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {selectedUserId ? (
              detailsLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : userDetails ? (
                <div className="divide-y divide-gray-200">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
                      <button
                        onClick={() => setSelectedUserId(null)}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-medium text-gray-600">
                        {userDetails.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xl font-semibold text-gray-900">{userDetails.username}</div>
                        <div className="text-sm text-gray-500">{userDetails.email}</div>
                        <div className="mt-1">{getStatusBadge(userDetails.accountStatus)}</div>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email Verified</span>
                        <span className={userDetails.emailVerified ? "text-green-600" : "text-red-600"}>
                          {userDetails.emailVerified ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Joined</span>
                        <span>{new Date(userDetails.createdAt).toLocaleDateString()}</span>
                      </div>
                      {userDetails.lastLoginAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Last Login</span>
                          <span>{new Date(userDetails.lastLoginAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {userDetails.activatedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Activated</span>
                          <span>
                            {new Date(userDetails.activatedAt).toLocaleDateString()}
                            {userDetails.activatorName && (
                              <span className="text-gray-400"> by {userDetails.activatorName}</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Families */}
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Families ({userDetails.families.length})</h4>
                    {userDetails.families.length > 0 ? (
                      <div className="space-y-2">
                        {userDetails.families.map((family) => (
                          <div key={family.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium text-gray-800">{family.name}</div>
                            <div className="text-xs text-gray-500">
                              {family.role} | {family.isOnboarded ? "Onboarded" : "Setup incomplete"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No families yet</p>
                    )}
                  </div>

                  {/* Admin Notes */}
                  {userDetails.adminNotes && (
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Admin Notes</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{userDetails.adminNotes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="p-4 space-y-2">
                    <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {userDetails.accountStatus !== "active" && (
                        <button
                          onClick={() => handleStatusChange(userDetails.id, "active")}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
                        >
                          Activate
                        </button>
                      )}
                      {userDetails.accountStatus !== "suspended" && (
                        <button
                          onClick={() => handleStatusChange(userDetails.id, "suspended")}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm font-medium"
                        >
                          Suspend
                        </button>
                      )}
                      {userDetails.accountStatus !== "rejected" && (
                        <button
                          onClick={() => handleStatusChange(userDetails.id, "rejected")}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setUserToDelete(userDetails.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ) : null
            ) : (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select a user to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete User?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete this user and all their associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
              >
                Cancel
              </Button>
              <button
                onClick={() => {
                  if (userToDelete) {
                    deleteMutation.mutate({ data: { userId: userToDelete } });
                  }
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
}
function StatCard({
  label,
  value,
  icon,
  color,
  highlight = false,
}: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50",
    yellow: "border-yellow-200 bg-yellow-50",
    green: "border-green-200 bg-green-50",
    orange: "border-orange-200 bg-orange-50",
    purple: "border-purple-200 bg-purple-50",
    indigo: "border-indigo-200 bg-indigo-50",
  };

  return (
    <div
      className={`p-4 rounded-xl border-2 ${colorClasses[color]} ${highlight ? "ring-2 ring-yellow-400 ring-offset-2" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
