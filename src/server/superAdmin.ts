import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  eq,
  desc,
  sql,
  and,
  or,
  ilike,
  gte,
  lte,
  asc,
  inArray,
} from "drizzle-orm";
import { db, schema } from "../db";
import { useAppSession } from "~/utils/session";
import type { AccountStatus } from "../db/schema/auth";
import type { AuditAction, AuditEntityType } from "../db/schema/audit";
import { sanitizeSearchInput } from "../utils/security";

// Helper to verify super admin access
async function requireSuperAdmin() {
  const session = await useAppSession();

  if (!session.data.isAuthenticated || !session.data.adminUserId) {
    throw new Error("Not authenticated");
  }

  const [user] = await db
    .select({ isSuperAdmin: schema.adminUsers.isSuperAdmin })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.id, session.data.adminUserId))
    .limit(1);

  if (!user?.isSuperAdmin) {
    throw new Error("Unauthorized: Super admin access required");
  }

  return { userId: session.data.adminUserId };
}

// Check if current user is a super admin
export const checkSuperAdmin = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      return { isSuperAdmin: false };
    }

    const [user] = await db
      .select({ isSuperAdmin: schema.adminUsers.isSuperAdmin })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, session.data.adminUserId))
      .limit(1);

    return { isSuperAdmin: user?.isSuperAdmin ?? false };
  }
);

// Check if default admin password needs to be changed
export const checkDefaultAdminSecurity = createServerFn({
  method: "GET",
}).handler(async () => {
  await requireSuperAdmin();

  // Check if there's a default admin that hasn't changed their password
  const [defaultAdmin] = await db
    .select({
      id: schema.adminUsers.id,
      username: schema.adminUsers.username,
      isDefaultAdmin: schema.adminUsers.isDefaultAdmin,
      passwordChangedAt: schema.adminUsers.passwordChangedAt,
    })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.isDefaultAdmin, true))
    .limit(1);

  if (!defaultAdmin) {
    return { needsPasswordChange: false };
  }

  // If default admin exists and password hasn't been changed, show warning
  const needsPasswordChange = defaultAdmin.passwordChangedAt === null;

  return {
    needsPasswordChange,
    defaultAdminUsername: defaultAdmin.username,
  };
});

// Get dashboard stats
export const getSuperAdminStats = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSuperAdmin();

    const [stats] = await db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        pendingUsers: sql<number>`count(*) filter (where ${schema.adminUsers.accountStatus} = 'pending')::int`,
        activeUsers: sql<number>`count(*) filter (where ${schema.adminUsers.accountStatus} = 'active')::int`,
        suspendedUsers: sql<number>`count(*) filter (where ${schema.adminUsers.accountStatus} = 'suspended')::int`,
        rejectedUsers: sql<number>`count(*) filter (where ${schema.adminUsers.accountStatus} = 'rejected')::int`,
      })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.isSuperAdmin, false));

    const [familyStats] = await db
      .select({
        totalFamilies: sql<number>`count(*)::int`,
        onboardedFamilies: sql<number>`count(*) filter (where ${schema.families.isOnboarded} = true)::int`,
      })
      .from(schema.families);

    // Recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentStats] = await db
      .select({
        recentSignups: sql<number>`count(*)::int`,
      })
      .from(schema.adminUsers)
      .where(
        and(
          eq(schema.adminUsers.isSuperAdmin, false),
          sql`${schema.adminUsers.createdAt} >= ${sevenDaysAgo}`
        )
      );

    return {
      ...stats,
      ...familyStats,
      recentSignups: recentStats?.recentSignups ?? 0,
    };
  }
);

// Get all users with pagination and filtering
const GetUsersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  status: z
    .enum(["all", "pending", "active", "suspended", "rejected"])
    .default("all"),
  search: z.string().optional(),
});

export const getUsers = createServerFn({ method: "GET" })
  .inputValidator(GetUsersSchema)
  .handler(async ({ data }) => {
    await requireSuperAdmin();

    const offset = (data.page - 1) * data.limit;

    // Build conditions
    const conditions = [eq(schema.adminUsers.isSuperAdmin, false)];

    if (data.status !== "all") {
      conditions.push(
        eq(schema.adminUsers.accountStatus, data.status as AccountStatus)
      );
    }

    if (data.search) {
      // Sanitize search input to prevent SQL LIKE pattern injection
      const sanitizedSearch = sanitizeSearchInput(data.search);
      conditions.push(
        or(
          ilike(schema.adminUsers.username, `%${sanitizedSearch}%`),
          ilike(schema.adminUsers.email, `%${sanitizedSearch}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    // Get users
    const users = await db
      .select({
        id: schema.adminUsers.id,
        username: schema.adminUsers.username,
        email: schema.adminUsers.email,
        emailVerified: schema.adminUsers.emailVerified,
        accountStatus: schema.adminUsers.accountStatus,
        adminNotes: schema.adminUsers.adminNotes,
        activatedAt: schema.adminUsers.activatedAt,
        createdAt: schema.adminUsers.createdAt,
        lastLoginAt: schema.adminUsers.lastLoginAt,
      })
      .from(schema.adminUsers)
      .where(whereClause)
      .orderBy(desc(schema.adminUsers.createdAt))
      .limit(data.limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.adminUsers)
      .where(whereClause);

    // Get family info for each user
    const userIds = users.map((u) => u.id);
    const userFamilies =
      userIds.length > 0
        ? await db
            .select({
              userId: schema.userFamilies.userId,
              familyId: schema.userFamilies.familyId,
              familyName: schema.families.name,
              role: schema.userFamilies.role,
            })
            .from(schema.userFamilies)
            .innerJoin(
              schema.families,
              eq(schema.userFamilies.familyId, schema.families.id)
            )
        : [];

    const familiesByUser = userFamilies.reduce(
      (acc, uf) => {
        if (!acc[uf.userId]) acc[uf.userId] = [];
        acc[uf.userId].push({
          familyId: uf.familyId,
          familyName: uf.familyName,
          role: uf.role,
        });
        return acc;
      },
      {} as Record<
        number,
        { familyId: number; familyName: string; role: string }[]
      >
    );

    return {
      users: users.map((user) => ({
        ...user,
        families: familiesByUser[user.id] || [],
      })),
      pagination: {
        page: data.page,
        limit: data.limit,
        total: countResult?.count ?? 0,
        totalPages: Math.ceil((countResult?.count ?? 0) / data.limit),
      },
    };
  });

// Update user account status
const UpdateUserStatusSchema = z.object({
  userId: z.number(),
  status: z.enum(["pending", "active", "suspended", "rejected"]),
  notes: z.string().optional(),
});

export const updateUserStatus = createServerFn({ method: "POST" })
  .inputValidator(UpdateUserStatusSchema)
  .handler(async ({ data }) => {
    const { userId: superAdminId } = await requireSuperAdmin();

    // Prevent modifying super admins
    const [targetUser] = await db
      .select({ isSuperAdmin: schema.adminUsers.isSuperAdmin })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, data.userId))
      .limit(1);

    if (targetUser?.isSuperAdmin) {
      throw new Error("Cannot modify super admin accounts");
    }

    const updateData: Record<string, unknown> = {
      accountStatus: data.status,
      updatedAt: new Date(),
    };

    if (data.notes !== undefined) {
      updateData.adminNotes = data.notes;
    }

    if (data.status === "active") {
      updateData.activatedAt = new Date();
      updateData.activatedBy = superAdminId;
    }

    await db
      .update(schema.adminUsers)
      .set(updateData)
      .where(eq(schema.adminUsers.id, data.userId));

    return { success: true };
  });

// Get user details
const GetUserDetailsSchema = z.object({
  userId: z.number(),
});

export const getUserDetails = createServerFn({ method: "GET" })
  .inputValidator(GetUserDetailsSchema)
  .handler(async ({ data }) => {
    await requireSuperAdmin();

    const [user] = await db
      .select({
        id: schema.adminUsers.id,
        username: schema.adminUsers.username,
        email: schema.adminUsers.email,
        emailVerified: schema.adminUsers.emailVerified,
        accountStatus: schema.adminUsers.accountStatus,
        adminNotes: schema.adminUsers.adminNotes,
        activatedAt: schema.adminUsers.activatedAt,
        activatedBy: schema.adminUsers.activatedBy,
        createdAt: schema.adminUsers.createdAt,
        lastLoginAt: schema.adminUsers.lastLoginAt,
      })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, data.userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    // Get families
    const families = await db
      .select({
        id: schema.families.id,
        name: schema.families.name,
        slug: schema.families.slug,
        isOnboarded: schema.families.isOnboarded,
        role: schema.userFamilies.role,
        createdAt: schema.families.createdAt,
      })
      .from(schema.userFamilies)
      .innerJoin(
        schema.families,
        eq(schema.userFamilies.familyId, schema.families.id)
      )
      .where(eq(schema.userFamilies.userId, data.userId));

    // Get activator info if exists
    let activatorName = null;
    if (user.activatedBy) {
      const [activator] = await db
        .select({ username: schema.adminUsers.username })
        .from(schema.adminUsers)
        .where(eq(schema.adminUsers.id, user.activatedBy))
        .limit(1);
      activatorName = activator?.username;
    }

    return {
      ...user,
      families,
      activatorName,
    };
  });

// Delete user (hard delete - use with caution)
const DeleteUserSchema = z.object({
  userId: z.number(),
});

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator(DeleteUserSchema)
  .handler(async ({ data }) => {
    await requireSuperAdmin();

    // Prevent deleting super admins
    const [targetUser] = await db
      .select({ isSuperAdmin: schema.adminUsers.isSuperAdmin })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, data.userId))
      .limit(1);

    if (targetUser?.isSuperAdmin) {
      throw new Error("Cannot delete super admin accounts");
    }

    // Delete the user (cascades will handle related records)
    await db
      .delete(schema.adminUsers)
      .where(eq(schema.adminUsers.id, data.userId));

    return { success: true };
  });

// ============================================================
// AUDIT LOG FUNCTIONS
// ============================================================

// Get audit logs with pagination and filtering
const GetAuditLogsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
  action: z.enum(["all", "create", "update", "delete"]).default("all"),
  entityType: z
    .enum([
      "all",
      "member",
      "timeslot",
      "todo",
      "todo_completion",
      "reward",
      "achievement",
      "family",
      "user",
      "settings",
    ])
    .default("all"),
  familyId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const getAuditLogs = createServerFn({ method: "GET" })
  .inputValidator(GetAuditLogsSchema)
  .handler(async ({ data }) => {
    await requireSuperAdmin();

    const offset = (data.page - 1) * data.limit;
    const conditions = [];

    if (data.action !== "all") {
      conditions.push(eq(schema.auditLogs.action, data.action as AuditAction));
    }

    if (data.entityType !== "all") {
      conditions.push(
        eq(schema.auditLogs.entityType, data.entityType as AuditEntityType)
      );
    }

    if (data.familyId) {
      conditions.push(eq(schema.auditLogs.familyId, data.familyId));
    }

    if (data.startDate) {
      const startDate = new Date(data.startDate);
      startDate.setHours(0, 0, 0, 0);
      conditions.push(gte(schema.auditLogs.createdAt, startDate));
    }

    if (data.endDate) {
      const endDate = new Date(data.endDate);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(schema.auditLogs.createdAt, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get audit logs with family and user info
    const logs = await db
      .select({
        id: schema.auditLogs.id,
        familyId: schema.auditLogs.familyId,
        userId: schema.auditLogs.userId,
        action: schema.auditLogs.action,
        entityType: schema.auditLogs.entityType,
        entityId: schema.auditLogs.entityId,
        oldValue: schema.auditLogs.oldValue,
        newValue: schema.auditLogs.newValue,
        ipAddress: schema.auditLogs.ipAddress,
        userAgent: schema.auditLogs.userAgent,
        createdAt: schema.auditLogs.createdAt,
      })
      .from(schema.auditLogs)
      .where(whereClause)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(data.limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.auditLogs)
      .where(whereClause);

    // Get family names for the logs
    const familyIds = [
      ...new Set(logs.filter((l) => l.familyId).map((l) => l.familyId!)),
    ];
    const familyNames: Record<number, string> = {};
    if (familyIds.length > 0) {
      const families = await db
        .select({ id: schema.families.id, name: schema.families.name })
        .from(schema.families)
        .where(inArray(schema.families.id, familyIds));
      families.forEach((f) => {
        familyNames[f.id] = f.name;
      });
    }

    // Get user names for the logs
    const userIds = [
      ...new Set(logs.filter((l) => l.userId).map((l) => l.userId!)),
    ];
    const userNames: Record<number, string> = {};
    if (userIds.length > 0) {
      const users = await db
        .select({
          id: schema.adminUsers.id,
          username: schema.adminUsers.username,
        })
        .from(schema.adminUsers)
        .where(inArray(schema.adminUsers.id, userIds));
      users.forEach((u) => {
        userNames[u.id] = u.username;
      });
    }

    return {
      logs: logs.map((log) => ({
        ...log,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        oldValue: log.oldValue as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newValue: log.newValue as any,
        familyName: log.familyId ? familyNames[log.familyId] : null,
        userName: log.userId ? userNames[log.userId] : null,
      })),
      pagination: {
        page: data.page,
        limit: data.limit,
        total: countResult?.count ?? 0,
        totalPages: Math.ceil((countResult?.count ?? 0) / data.limit),
      },
    };
  });

// Get audit statistics and analytics
export const getAuditStats = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSuperAdmin();

    // Get overall stats
    const [overall] = await db
      .select({
        totalEvents: sql<number>`count(*)::int`,
        todayEvents: sql<number>`count(*) filter (where ${schema.auditLogs.createdAt} >= current_date)::int`,
        weekEvents: sql<number>`count(*) filter (where ${schema.auditLogs.createdAt} >= current_date - interval '7 days')::int`,
        monthEvents: sql<number>`count(*) filter (where ${schema.auditLogs.createdAt} >= current_date - interval '30 days')::int`,
      })
      .from(schema.auditLogs);

    // Get action breakdown
    const actionBreakdown = await db
      .select({
        action: schema.auditLogs.action,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.auditLogs)
      .groupBy(schema.auditLogs.action)
      .orderBy(desc(sql`count(*)`));

    // Get entity type breakdown
    const entityBreakdown = await db
      .select({
        entityType: schema.auditLogs.entityType,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.auditLogs)
      .groupBy(schema.auditLogs.entityType)
      .orderBy(desc(sql`count(*)`));

    // Get top families by activity (last 30 days)
    const topFamilies = await db
      .select({
        familyId: schema.auditLogs.familyId,
        familyName: schema.families.name,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.auditLogs)
      .leftJoin(
        schema.families,
        eq(schema.auditLogs.familyId, schema.families.id)
      )
      .where(
        and(
          sql`${schema.auditLogs.familyId} IS NOT NULL`,
          gte(
            schema.auditLogs.createdAt,
            sql`current_date - interval '30 days'`
          )
        )
      )
      .groupBy(schema.auditLogs.familyId, schema.families.name)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Get activity timestamps for last 14 days
    // Return raw timestamps so client can group by local date
    const activityTimestamps = await db
      .select({
        createdAt: schema.auditLogs.createdAt,
      })
      .from(schema.auditLogs)
      .where(gte(schema.auditLogs.createdAt, sql`now() - interval '14 days'`));

    // Group by local date on the server for backwards compatibility
    // Client can use activityTimestamps for local timezone grouping
    const dailyActivity = await db
      .select({
        date: sql<string>`date(${schema.auditLogs.createdAt})::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.auditLogs)
      .where(gte(schema.auditLogs.createdAt, sql`now() - interval '14 days'`))
      .groupBy(sql`date(${schema.auditLogs.createdAt})`)
      .orderBy(asc(sql`date(${schema.auditLogs.createdAt})`));

    // Get recent unique IPs (last 24 hours)
    const [uniqueIps] = await db
      .select({
        count: sql<number>`count(distinct ${schema.auditLogs.ipAddress})::int`,
      })
      .from(schema.auditLogs)
      .where(
        and(
          sql`${schema.auditLogs.ipAddress} IS NOT NULL`,
          gte(schema.auditLogs.createdAt, sql`now() - interval '24 hours'`)
        )
      );

    return {
      overall: overall || {
        totalEvents: 0,
        todayEvents: 0,
        weekEvents: 0,
        monthEvents: 0,
      },
      actionBreakdown,
      entityBreakdown,
      topFamilies,
      dailyActivity,
      activityTimestamps: activityTimestamps.map((t) => t.createdAt.toISOString()),
      uniqueIps24h: uniqueIps?.count ?? 0,
    };
  }
);

// Get all families for filter dropdown
export const getAllFamilies = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSuperAdmin();

    const families = await db
      .select({
        id: schema.families.id,
        name: schema.families.name,
      })
      .from(schema.families)
      .orderBy(asc(schema.families.name));

    return { families };
  }
);
