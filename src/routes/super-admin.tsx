import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
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
import { Button, Input, Select, Badge, SkeletonCard, EmptyState, Alert } from "../components/shared";
import { Modal } from "../components/shared/Modal";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { AdminCard, ActionItem } from "../components/admin/AdminCard";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Shield,
  Home,
  LogOut,
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

type UserType = {
  id: number;
  username: string;
  email: string;
  accountStatus: string;
  createdAt: string;
};

function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [searchTerm, setSearchTerm] = useState(search.search || "");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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
    enabled: !!selectedUserId && showDetailsModal,
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
      setSelectedUserId(null);
      setShowDetailsModal(false);
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

  const openUserDetails = (userId: number) => {
    setSelectedUserId(userId);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedUserId(null);
  };

  const getStatusBadge = (status: string) => {
    const variantMap: Record<string, "warning" | "success" | "danger" | "info"> = {
      pending: "warning",
      active: "success",
      suspended: "warning",
      rejected: "danger",
    };
    return (
      <Badge variant={variantMap[status] || "info"} size="sm">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredUsers = useMemo(() => usersData?.users || [], [usersData]);
  const pendingCount = stats?.pendingUsers || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast />

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b-2 border-theme-primary/20">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center flex-shrink-0 shadow-md">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800">
                Super Admin
              </h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/admin"
                className="flex items-center justify-center gap-2 p-2 sm:px-3 sm:py-2 rounded-xl bg-theme-primary/10 hover:bg-theme-primary/20 active:bg-theme-primary/30 transition-colors min-h-[44px] min-w-[44px]"
                title="Admin Dashboard"
              >
                <Home className="w-5 h-5 text-theme-primary" />
                <span className="hidden sm:inline text-sm font-medium text-theme-primary">Dashboard</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 p-2 sm:px-3 sm:py-2 rounded-xl bg-red-100 hover:bg-red-200 active:bg-red-300 transition-colors min-h-[44px] min-w-[44px]"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-red-600" />
                <span className="hidden sm:inline text-sm font-medium text-red-600">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Security Warning */}
        {securityCheck?.needsPasswordChange && (
          <Alert
            variant="danger"
            title="Security Warning: Default Admin Password Not Changed"
            message={`The default admin account "${securityCheck.defaultAdminUsername}" is using the default password. Please change it immediately.`}
            action={{
              label: "Change Password",
              onClick: () => window.location.href = "/admin?tab=security",
            }}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={<Users className="w-5 h-5 text-theme-primary" />}
          />
          <StatCard
            label="Pending"
            value={stats?.pendingUsers ?? 0}
            icon={<Clock className="w-5 h-5 text-yellow-600" />}
            highlight={pendingCount > 0}
          />
          <StatCard
            label="Active"
            value={stats?.activeUsers ?? 0}
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          />
          <StatCard
            label="Suspended"
            value={stats?.suspendedUsers ?? 0}
            icon={<AlertCircle className="w-5 h-5 text-orange-600" />}
          />
          <StatCard
            label="Families"
            value={stats?.totalFamilies ?? 0}
            icon={<Home className="w-5 h-5 text-theme-secondary" />}
          />
          <StatCard
            label="This Week"
            value={stats?.recentSignups ?? 0}
            icon={<Users className="w-5 h-5 text-indigo-600" />}
          />
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">User Management</h2>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  leftIcon={<Search className="w-5 h-5" />}
                />
              </div>
              <Select
                value={search.status}
                onChange={(e) => handleStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">All Users</option>
                <option value="pending">Pending {pendingCount > 0 ? `(${pendingCount})` : ""}</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="rejected">Rejected</option>
              </Select>
              <Button onClick={handleSearch}>Search</Button>
            </div>
          </div>

          {/* Users List */}
          {usersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} lines={2} />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            searchTerm ? (
              <EmptyState
                title={`No users match "${searchTerm}"`}
                action={{ label: "Clear search", onClick: () => { setSearchTerm(""); handleSearch(); } }}
              />
            ) : (
              <EmptyState
                icon={<Users className="w-12 h-12 text-gray-300 mb-4" />}
                title="No users in this category"
                description="Try selecting a different status filter"
              />
            )
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user: UserType) => {
                const userActions: ActionItem[] = [
                  {
                    label: "View Details",
                    icon: <Search className="w-4 h-4" />,
                    onClick: () => openUserDetails(user.id),
                  },
                ];

                // Add Activate action if not already active
                if (user.accountStatus !== "active") {
                  userActions.push({
                    label: "Activate",
                    icon: <CheckCircle className="w-4 h-4" />,
                    onClick: () => handleStatusChange(user.id, "active"),
                  });
                }

                // Add Suspend action if not already suspended
                if (user.accountStatus !== "suspended") {
                  userActions.push({
                    label: "Suspend",
                    icon: <AlertCircle className="w-4 h-4" />,
                    onClick: () => handleStatusChange(user.id, "suspended"),
                  });
                }

                // Add Reject action if not already rejected
                if (user.accountStatus !== "rejected") {
                  userActions.push({
                    label: "Reject",
                    icon: <XCircle className="w-4 h-4" />,
                    onClick: () => handleStatusChange(user.id, "rejected"),
                    variant: "danger",
                  });
                }

                // Always add Delete action
                userActions.push({
                  label: "Delete",
                  icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
                  onClick: () => {
                    setSelectedUserId(user.id);
                    setShowDeleteConfirm(true);
                  },
                  variant: "danger",
                });

                return (
                <AdminCard
                  key={user.id}
                  actions={userActions}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800 truncate">{user.username}</h3>
                        {getStatusBadge(user.accountStatus)}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      <p className="text-xs text-gray-400">
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </AdminCard>
              );
              })}
            </div>
          )}

          {/* Pagination */}
          {usersData && usersData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Page {usersData.pagination.page} of {usersData.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(usersData.pagination.page - 1)}
                  disabled={usersData.pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(usersData.pagination.page + 1)}
                  disabled={usersData.pagination.page === usersData.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={closeDetailsModal}
        title="User Details"
      >
        {detailsLoading ? (
          <div className="space-y-3">
            <SkeletonCard lines={3} />
          </div>
        ) : userDetails ? (
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center text-2xl font-bold text-white">
                {userDetails.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{userDetails.username}</h3>
                <p className="text-sm text-gray-500">{userDetails.email}</p>
                <div className="mt-1">{getStatusBadge(userDetails.accountStatus)}</div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Email Verified</span>
                <Badge variant={userDetails.emailVerified ? "success" : "danger"} size="sm">
                  {userDetails.emailVerified ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Joined</span>
                <span className="font-medium">{new Date(userDetails.createdAt).toLocaleDateString()}</span>
              </div>
              {userDetails.lastLoginAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Login</span>
                  <span className="font-medium">{new Date(userDetails.lastLoginAt).toLocaleDateString()}</span>
                </div>
              )}
              {userDetails.activatedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Activated</span>
                  <span className="font-medium">
                    {new Date(userDetails.activatedAt).toLocaleDateString()}
                    {userDetails.activatorName && (
                      <span className="text-gray-400"> by {userDetails.activatorName}</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Families */}
            <div>
              <h4 className="font-bold text-gray-900 mb-3">Families ({userDetails.families.length})</h4>
              {userDetails.families.length > 0 ? (
                <div className="space-y-2">
                  {userDetails.families.map((family: { id: number; name: string; role: string; isOnboarded: boolean }) => (
                    <div key={family.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="font-medium text-gray-800">{family.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                        <Badge variant="secondary" size="sm">{family.role}</Badge>
                        <Badge variant={family.isOnboarded ? "success" : "warning"} size="sm">
                          {family.isOnboarded ? "Onboarded" : "Setup incomplete"}
                        </Badge>
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
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Admin Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">{userDetails.adminNotes}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          if (!showDetailsModal) setSelectedUserId(null);
        }}
        onConfirm={() => {
          if (selectedUserId) {
            deleteMutation.mutate({ data: { userId: selectedUserId } });
          }
        }}
        title="Delete User?"
        message="This will permanently delete this user and all their associated data. This action cannot be undone."
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}

function StatCard({ label, value, icon, highlight = false }: StatCardProps) {
  return (
    <div
      className={`p-4 rounded-xl border-2 border-gray-200 bg-white ${highlight ? "ring-2 ring-theme-primary ring-offset-2" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
