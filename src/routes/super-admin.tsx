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
  getAuditLogs,
  getAuditStats,
  getAllFamilies,
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
  FileText,
  Activity,
  Calendar,
  Filter,
  Eye,
  TrendingUp,
  Globe,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { logout } from "../server/auth";

const searchSchema = z.object({
  tab: z.enum(["users", "audit"]).optional().default("users"),
  page: z.number().optional().default(1),
  status: z.enum(["all", "pending", "active", "suspended", "rejected"]).optional().default("all"),
  search: z.string().optional(),
  // Audit filters
  auditPage: z.number().optional().default(1),
  auditAction: z.enum(["all", "create", "update", "delete"]).optional().default("all"),
  auditEntity: z.enum(["all", "member", "timeslot", "todo", "todo_completion", "reward", "achievement", "family", "user", "settings"]).optional().default("all"),
  auditFamilyId: z.number().optional(),
  auditStartDate: z.string().optional(),
  auditEndDate: z.string().optional(),
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
type AuditActionFilter = "all" | "create" | "update" | "delete";
type AuditEntityFilter = "all" | "member" | "timeslot" | "todo" | "todo_completion" | "reward" | "achievement" | "family" | "user" | "settings";

type UserType = {
  id: number;
  username: string;
  email: string | null;
  accountStatus: "pending" | "active" | "suspended" | "rejected";
  createdAt: Date;
};

type AuditLogType = {
  id: number;
  familyId: number | null;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  familyName: string | null;
  userName: string | null;
};

type AuditLogsResponse = {
  logs: AuditLogType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [searchTerm, setSearchTerm] = useState(search.search || "");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogType | null>(null);

  const activeTab = search.tab || "users";

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
    enabled: activeTab === "users",
  });

  // User details query
  const { data: userDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["super-admin-user-details", selectedUserId],
    queryFn: () => getUserDetails({ data: { userId: selectedUserId! } }),
    enabled: !!selectedUserId && showDetailsModal,
  });

  // Audit logs query
  const { data: auditLogsData, isLoading: auditLogsLoading } = useQuery<AuditLogsResponse>({
    queryKey: ["super-admin-audit-logs", {
      page: search.auditPage,
      action: search.auditAction,
      entityType: search.auditEntity,
      familyId: search.auditFamilyId,
      startDate: search.auditStartDate,
      endDate: search.auditEndDate,
    }],
    queryFn: async () => {
      const result = await getAuditLogs({
        data: {
          page: search.auditPage || 1,
          limit: 50,
          action: search.auditAction || "all",
          entityType: search.auditEntity || "all",
          familyId: search.auditFamilyId,
          startDate: search.auditStartDate,
          endDate: search.auditEndDate,
        },
      });
      return result as AuditLogsResponse;
    },
    enabled: activeTab === "audit",
  });

  // Audit stats query
  const { data: auditStats } = useQuery({
    queryKey: ["super-admin-audit-stats"],
    queryFn: () => getAuditStats(),
    enabled: activeTab === "audit",
  });

  // All families for filter
  const { data: familiesData } = useQuery({
    queryKey: ["super-admin-all-families"],
    queryFn: () => getAllFamilies(),
    enabled: activeTab === "audit",
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

  const handleTabChange = useCallback(
    (tab: "users" | "audit") => {
      navigate({
        search: { ...search, tab },
      });
    },
    [navigate, search]
  );

  const handleAuditPageChange = useCallback(
    (page: number) => {
      navigate({
        search: { ...search, auditPage: page },
      });
    },
    [navigate, search]
  );

  const handleAuditFilterChange = useCallback(
    (key: string, value: string | number | undefined) => {
      navigate({
        search: { ...search, auditPage: 1, [key]: value },
      });
    },
    [navigate, search]
  );

  const clearAuditFilters = useCallback(() => {
    navigate({
      search: {
        ...search,
        auditPage: 1,
        auditAction: "all",
        auditEntity: "all",
        auditFamilyId: undefined,
        auditStartDate: undefined,
        auditEndDate: undefined,
      },
    });
  }, [navigate, search]);

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

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return <Plus className="w-4 h-4 text-green-600" />;
      case "update":
        return <Pencil className="w-4 h-4 text-blue-600" />;
      case "delete":
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    const variantMap: Record<string, "success" | "info" | "danger" | "warning"> = {
      create: "success",
      update: "info",
      delete: "danger",
    };
    return (
      <Badge variant={variantMap[action] || "info"} size="sm">
        {action.charAt(0).toUpperCase() + action.slice(1)}
      </Badge>
    );
  };

  const formatEntityType = (type: string) => {
    return type.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const filteredUsers = useMemo(() => usersData?.users || [], [usersData]);
  const pendingCount = stats?.pendingUsers || 0;

  const hasActiveAuditFilters = search.auditAction !== "all" ||
    search.auditEntity !== "all" ||
    search.auditFamilyId ||
    search.auditStartDate ||
    search.auditEndDate;

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

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => handleTabChange("users")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "users"
                ? "border-theme-primary text-theme-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-4 h-4" />
            Users
            {pendingCount > 0 && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange("audit")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "audit"
                ? "border-theme-primary text-theme-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="w-4 h-4" />
            Audit Logs
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <>
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

            {/* User Management */}
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">User Management</h2>
                </div>

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

                    if (user.accountStatus !== "active") {
                      userActions.push({
                        label: "Activate",
                        icon: <CheckCircle className="w-4 h-4" />,
                        onClick: () => handleStatusChange(user.id, "active"),
                      });
                    }

                    if (user.accountStatus !== "suspended") {
                      userActions.push({
                        label: "Suspend",
                        icon: <AlertCircle className="w-4 h-4" />,
                        onClick: () => handleStatusChange(user.id, "suspended"),
                      });
                    }

                    if (user.accountStatus !== "rejected") {
                      userActions.push({
                        label: "Reject",
                        icon: <XCircle className="w-4 h-4" />,
                        onClick: () => handleStatusChange(user.id, "rejected"),
                        variant: "danger",
                      });
                    }

                    userActions.push({
                      label: "Delete",
                      icon: <Trash2 className="w-4 h-4" />,
                      onClick: () => {
                        setSelectedUserId(user.id);
                        setShowDeleteConfirm(true);
                      },
                      variant: "danger",
                    });

                    return (
                      <AdminCard key={user.id} actions={userActions}>
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

              {/* Users Pagination */}
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
          </>
        )}

        {/* Audit Tab */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            {/* Audit Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard
                label="Total Events"
                value={auditStats?.overall.totalEvents ?? 0}
                icon={<FileText className="w-5 h-5 text-theme-primary" />}
              />
              <StatCard
                label="Today"
                value={auditStats?.overall.todayEvents ?? 0}
                icon={<Calendar className="w-5 h-5 text-green-600" />}
              />
              <StatCard
                label="This Week"
                value={auditStats?.overall.weekEvents ?? 0}
                icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
              />
              <StatCard
                label="This Month"
                value={auditStats?.overall.monthEvents ?? 0}
                icon={<Activity className="w-5 h-5 text-purple-600" />}
              />
              <StatCard
                label="Unique IPs (24h)"
                value={auditStats?.uniqueIps24h ?? 0}
                icon={<Globe className="w-5 h-5 text-orange-600" />}
              />
              <StatCard
                label="Active Families"
                value={auditStats?.topFamilies?.length ?? 0}
                icon={<Home className="w-5 h-5 text-theme-secondary" />}
              />
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Action Breakdown */}
              <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Actions Breakdown
                </h3>
                <div className="space-y-2">
                  {auditStats?.actionBreakdown?.map((item: { action: string; count: number }) => (
                    <div key={item.action} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getActionIcon(item.action)}
                        <span className="text-sm text-gray-600 capitalize">{item.action}</span>
                      </div>
                      <span className="font-bold text-gray-800">{item.count}</span>
                    </div>
                  ))}
                  {(!auditStats?.actionBreakdown || auditStats.actionBreakdown.length === 0) && (
                    <p className="text-sm text-gray-400">No data available</p>
                  )}
                </div>
              </div>

              {/* Entity Breakdown */}
              <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Entity Types
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {auditStats?.entityBreakdown?.map((item: { entityType: string; count: number }) => (
                    <div key={item.entityType} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{formatEntityType(item.entityType)}</span>
                      <span className="font-bold text-gray-800">{item.count}</span>
                    </div>
                  ))}
                  {(!auditStats?.entityBreakdown || auditStats.entityBreakdown.length === 0) && (
                    <p className="text-sm text-gray-400">No data available</p>
                  )}
                </div>
              </div>

              {/* Top Families */}
              <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Most Active Families (30d)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {auditStats?.topFamilies?.map((item: { familyId: number | null; familyName: string | null; count: number }) => (
                    <div key={item.familyId} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 truncate max-w-[150px]">
                        {item.familyName || `Family #${item.familyId}`}
                      </span>
                      <span className="font-bold text-gray-800">{item.count}</span>
                    </div>
                  ))}
                  {(!auditStats?.topFamilies || auditStats.topFamilies.length === 0) && (
                    <p className="text-sm text-gray-400">No data available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Daily Activity Chart */}
            <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Daily Activity (Last 14 Days)
              </h3>
              <div className="flex items-end gap-1 h-32">
                {(() => {
                  // Group timestamps by LOCAL date (user's timezone)
                  const activityMap = new Map<string, number>();

                  // Use activityTimestamps if available (has raw ISO timestamps)
                  // This allows grouping by local date instead of UTC
                  if (auditStats?.activityTimestamps) {
                    auditStats.activityTimestamps.forEach((isoTimestamp: string) => {
                      // Convert to local date string
                      const localDate = new Date(isoTimestamp);
                      const localDateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
                      activityMap.set(localDateStr, (activityMap.get(localDateStr) || 0) + 1);
                    });
                  } else if (auditStats?.dailyActivity) {
                    // Fallback to server-grouped data (UTC dates)
                    auditStats.dailyActivity.forEach((day: { date: string; count: number }) => {
                      activityMap.set(day.date, day.count);
                    });
                  }

                  // Generate 14 days ending with today (local)
                  const getLocalDateString = (d: Date) => {
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  };

                  const today = new Date();
                  const days: { date: string; count: number; dateObj: Date }[] = [];

                  for (let i = 13; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(d.getDate() - i);
                    const dateStr = getLocalDateString(d);
                    days.push({
                      date: dateStr,
                      count: activityMap.get(dateStr) || 0,
                      dateObj: d,
                    });
                  }

                  const maxCount = Math.max(...days.map((d) => d.count), 1);

                  return days.map((day) => {
                    const height = (day.count / maxCount) * 100;
                    const dayName = day.dateObj.toLocaleDateString("en-US", { weekday: "short" });
                    const dayNum = day.dateObj.getDate();
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500 font-medium">
                          {day.count > 0 ? day.count : ""}
                        </span>
                        <div
                          className={`w-full rounded-t transition-all ${day.count > 0 ? "bg-theme-primary" : "bg-gray-100"}`}
                          style={{ height: `${Math.max(height, day.count > 0 ? 8 : 4)}%` }}
                          title={`${day.date}: ${day.count} events`}
                        />
                        <div className="text-center">
                          <span className="text-[10px] text-gray-400 block">{dayName}</span>
                          <span className="text-[10px] text-gray-300">{dayNum}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Audit Logs List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Audit Logs
                </h2>
                {hasActiveAuditFilters && (
                  <Button variant="secondary" size="sm" onClick={clearAuditFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl p-4 border-2 border-gray-200 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Filter className="w-4 h-4" />
                  Filters
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <Select
                    value={search.auditAction || "all"}
                    onChange={(e) => handleAuditFilterChange("auditAction", e.target.value as AuditActionFilter)}
                  >
                    <option value="all">All Actions</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                  </Select>
                  <Select
                    value={search.auditEntity || "all"}
                    onChange={(e) => handleAuditFilterChange("auditEntity", e.target.value as AuditEntityFilter)}
                  >
                    <option value="all">All Entities</option>
                    <option value="member">Member</option>
                    <option value="timeslot">Timeslot</option>
                    <option value="todo">Todo</option>
                    <option value="todo_completion">Completion</option>
                    <option value="reward">Reward</option>
                    <option value="achievement">Achievement</option>
                    <option value="family">Family</option>
                    <option value="user">User</option>
                    <option value="settings">Settings</option>
                  </Select>
                  <Select
                    value={search.auditFamilyId?.toString() || ""}
                    onChange={(e) => handleAuditFilterChange("auditFamilyId", e.target.value ? parseInt(e.target.value) : undefined)}
                  >
                    <option value="">All Families</option>
                    {familiesData?.families?.map((family: { id: number; name: string }) => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="date"
                    value={search.auditStartDate || ""}
                    onChange={(e) => handleAuditFilterChange("auditStartDate", e.target.value || undefined)}
                    placeholder="Start Date"
                  />
                  <Input
                    type="date"
                    value={search.auditEndDate || ""}
                    onChange={(e) => handleAuditFilterChange("auditEndDate", e.target.value || undefined)}
                    placeholder="End Date"
                  />
                </div>
              </div>

              {/* Logs */}
              {auditLogsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonCard key={i} lines={2} />
                  ))}
                </div>
              ) : !auditLogsData?.logs || auditLogsData.logs.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-12 h-12 text-gray-300 mb-4" />}
                  title="No audit logs found"
                  description={hasActiveAuditFilters ? "Try adjusting your filters" : "Audit logs will appear here as activity occurs"}
                />
              ) : (
                <div className="space-y-2">
                  {auditLogsData.logs.map((log: AuditLogType) => (
                    <div
                      key={log.id}
                      className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                      onClick={() => setSelectedAuditLog(log)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                            {getActionIcon(log.action)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getActionBadge(log.action)}
                              <Badge variant="secondary" size="sm">
                                {formatEntityType(log.entityType)}
                              </Badge>
                              {log.entityId && (
                                <span className="text-xs text-gray-400">#{log.entityId}</span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                              {log.familyName && (
                                <span className="flex items-center gap-1">
                                  <Home className="w-3 h-3" />
                                  {log.familyName}
                                </span>
                              )}
                              {log.userName && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {log.userName}
                                </span>
                              )}
                              {log.ipAddress && (
                                <span className="flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  {log.ipAddress}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                          <Eye className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Audit Pagination */}
              {auditLogsData && auditLogsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-gray-500">
                    Page {auditLogsData.pagination.page} of {auditLogsData.pagination.totalPages}
                    <span className="text-gray-400 ml-2">
                      ({auditLogsData.pagination.total} total)
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAuditPageChange(auditLogsData.pagination.page - 1)}
                      disabled={auditLogsData.pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAuditPageChange(auditLogsData.pagination.page + 1)}
                      disabled={auditLogsData.pagination.page === auditLogsData.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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

            {userDetails.adminNotes && (
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Admin Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">{userDetails.adminNotes}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Audit Log Detail Modal */}
      <Modal
        isOpen={!!selectedAuditLog}
        onClose={() => setSelectedAuditLog(null)}
        title="Audit Log Details"
      >
        {selectedAuditLog && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-xl">
                {getActionIcon(selectedAuditLog.action)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {getActionBadge(selectedAuditLog.action)}
                  <Badge variant="secondary" size="sm">
                    {formatEntityType(selectedAuditLog.entityType)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(selectedAuditLog.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {selectedAuditLog.entityId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Entity ID</span>
                  <span className="font-medium">#{selectedAuditLog.entityId}</span>
                </div>
              )}
              {selectedAuditLog.familyName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Family</span>
                  <span className="font-medium">{selectedAuditLog.familyName}</span>
                </div>
              )}
              {selectedAuditLog.userName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">User</span>
                  <span className="font-medium">{selectedAuditLog.userName}</span>
                </div>
              )}
              {selectedAuditLog.ipAddress && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IP Address</span>
                  <span className="font-mono text-xs">{selectedAuditLog.ipAddress}</span>
                </div>
              )}
            </div>

            {selectedAuditLog.oldValue && (
              <div>
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  Old Value
                </h4>
                <pre className="text-xs bg-red-50 p-3 rounded-xl overflow-auto max-h-48 text-red-800">
                  {JSON.stringify(selectedAuditLog.oldValue, null, 2)}
                </pre>
              </div>
            )}

            {selectedAuditLog.newValue && (
              <div>
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-500" />
                  New Value
                </h4>
                <pre className="text-xs bg-green-50 p-3 rounded-xl overflow-auto max-h-48 text-green-800">
                  {JSON.stringify(selectedAuditLog.newValue, null, 2)}
                </pre>
              </div>
            )}

            {selectedAuditLog.userAgent && (
              <div>
                <h4 className="font-bold text-gray-900 mb-2">User Agent</h4>
                <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl break-all">
                  {selectedAuditLog.userAgent}
                </p>
              </div>
            )}
          </div>
        )}
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
