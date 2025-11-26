import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { db, schema } from "../db";
import crypto from "crypto";
import { requireRole } from "../utils/tenant";
import { checkRateLimit, recordAttempt } from "../utils/rateLimiter";
import { isValidShareToken } from "../utils/security";
import { logAudit } from "../utils/audit";

/**
 * Generate a secure share token
 */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Get family data by share token (public access - no auth required)
 */
const GetFamilyByTokenSchema = z.object({
  token: z.string().length(64, "Invalid token"),
});

export const getFamilyByShareToken = createServerFn({ method: "GET" })
  .inputValidator(GetFamilyByTokenSchema)
  .handler(async ({ data }) => {
    // Validate token format before database query
    if (!isValidShareToken(data.token)) {
      return null;
    }

    const [family] = await db
      .select({
        id: schema.families.id,
        name: schema.families.name,
        isOnboarded: schema.families.isOnboarded,
      })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family || !family.isOnboarded) {
      return null;
    }

    return family;
  });

/**
 * Get members for public board (no auth required, uses share token)
 */
export const getPublicMembers = createServerFn({ method: "GET" })
  .inputValidator(GetFamilyByTokenSchema)
  .handler(async ({ data }) => {
    // First verify the token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    const members = await db
      .select()
      .from(schema.members)
      .where(eq(schema.members.familyId, family.id))
      .orderBy(asc(schema.members.createdAt));

    return members;
  });

/**
 * Get timeslots for public board (no auth required, uses share token)
 */
const GetPublicTimeslotsSchema = z.object({
  token: z.string().length(64),
  date: z.string().optional(),
});

export const getPublicTimeslots = createServerFn({ method: "GET" })
  .inputValidator(GetPublicTimeslotsSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    const timeslots = await db
      .select()
      .from(schema.timeslots)
      .where(
        and(
          eq(schema.timeslots.familyId, family.id),
          eq(schema.timeslots.isActive, true)
        )
      )
      .orderBy(asc(schema.timeslots.startTime));

    // Get member assignments for each timeslot
    const timeslotIds = timeslots.map((t) => t.id);
    const allAssignments =
      timeslotIds.length > 0
        ? await db.select().from(schema.timeslotMembers)
        : [];

    const assignmentsByTimeslot = allAssignments.reduce(
      (acc, assignment) => {
        if (!acc[assignment.timeslotId]) {
          acc[assignment.timeslotId] = [];
        }
        acc[assignment.timeslotId].push(assignment.memberId);
        return acc;
      },
      {} as Record<number, number[]>
    );

    return timeslots.map((timeslot) => ({
      ...timeslot,
      memberIds: assignmentsByTimeslot[timeslot.id] || [],
    }));
  });

/**
 * Get todos for public board (no auth required, uses share token)
 */
export const getPublicTodos = createServerFn({ method: "GET" })
  .inputValidator(GetFamilyByTokenSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    const todos = await db
      .select()
      .from(schema.todos)
      .where(eq(schema.todos.familyId, family.id))
      .orderBy(asc(schema.todos.position));

    // Get timeslot assignments
    const todoIds = todos.map((t) => t.id);
    const allAssignments =
      todoIds.length > 0 ? await db.select().from(schema.todoTimeslots) : [];

    const assignmentsByTodo = allAssignments.reduce(
      (acc, assignment) => {
        if (!acc[assignment.todoId]) {
          acc[assignment.todoId] = [];
        }
        acc[assignment.todoId].push(assignment.timeslotId);
        return acc;
      },
      {} as Record<number, number[]>
    );

    return todos.map((todo) => ({
      ...todo,
      timeslotIds: assignmentsByTodo[todo.id] || [],
    }));
  });

/**
 * Get completions for public board (no auth required, uses share token)
 */
const GetPublicCompletionsSchema = z.object({
  token: z.string().length(64),
  date: z.string(),
});

export const getPublicCompletions = createServerFn({ method: "GET" })
  .inputValidator(GetPublicCompletionsSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    // Get all members for this family to filter completions
    const members = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.familyId, family.id));

    const memberIds = members.map((m) => m.id);

    if (memberIds.length === 0) {
      return [];
    }

    // Get completions for these members on the given date
    const completions = await db
      .select()
      .from(schema.todoCompletions)
      .where(eq(schema.todoCompletions.completionDate, data.date));

    // Filter to only this family's members
    return completions.filter((c) => memberIds.includes(c.memberId));
  });

/**
 * Toggle todo completion (public - uses share token for family verification)
 * Rate limited to prevent abuse
 */
const TogglePublicTodoSchema = z.object({
  token: z.string().length(64),
  todoId: z.number(),
  timeslotId: z.number(),
  memberId: z.number(),
  date: z.string(),
  completed: z.boolean(),
});

export const togglePublicTodo = createServerFn({ method: "POST" })
  .inputValidator(TogglePublicTodoSchema)
  .handler(async ({ data }) => {
    // Validate token format
    if (!isValidShareToken(data.token)) {
      throw new Error("Invalid share token");
    }

    // Check rate limit for this token
    const rateLimit = checkRateLimit("publicBoard", data.token);
    if (!rateLimit.allowed) {
      throw new Error(
        `Too many requests. Please try again in ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`
      );
    }

    // Record this attempt
    recordAttempt("publicBoard", data.token);

    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    // Verify the member belongs to this family
    const [member] = await db
      .select({ id: schema.members.id, name: schema.members.name })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, family.id)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found");
    }

    // Verify the todo belongs to this family
    const [todo] = await db
      .select({ id: schema.todos.id, title: schema.todos.title })
      .from(schema.todos)
      .where(
        and(
          eq(schema.todos.id, data.todoId),
          eq(schema.todos.familyId, family.id)
        )
      )
      .limit(1);

    if (!todo) {
      throw new Error("Todo not found");
    }

    if (data.completed) {
      // Add completion
      await db
        .insert(schema.todoCompletions)
        .values({
          todoId: data.todoId,
          timeslotId: data.timeslotId,
          memberId: data.memberId,
          completionDate: data.date,
        })
        .onConflictDoNothing();
    } else {
      // Remove completion
      await db
        .delete(schema.todoCompletions)
        .where(
          and(
            eq(schema.todoCompletions.todoId, data.todoId),
            eq(schema.todoCompletions.timeslotId, data.timeslotId),
            eq(schema.todoCompletions.memberId, data.memberId),
            eq(schema.todoCompletions.completionDate, data.date)
          )
        );
    }

    // Audit log for public board mutations
    await logAudit({
      familyId: family.id,
      action: data.completed ? "create" : "delete",
      entityType: "todo_completion",
      entityId: data.todoId,
      newValue: {
        todoId: data.todoId,
        todoTitle: todo.title,
        memberId: data.memberId,
        memberName: member.name,
        date: data.date,
        completed: data.completed,
        source: "public_board",
      },
    });

    return { success: true };
  });

/**
 * Get member stats for public board (no auth required, uses share token)
 */
export const getPublicMemberStats = createServerFn({ method: "GET" })
  .inputValidator(GetFamilyByTokenSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    // Get all members for this family
    const members = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.familyId, family.id));

    const memberIds = members.map((m) => m.id);

    if (memberIds.length === 0) {
      return [];
    }

    // Get stats for all members
    const stats = await db
      .select()
      .from(schema.memberStats);

    // Filter to only this family's members
    return stats.filter((s) => memberIds.includes(s.memberId));
  });

/**
 * Regenerate share token (requires auth - admin only)
 * This invalidates all existing share links
 */
export const regenerateShareToken = createServerFn({ method: "POST" }).handler(
  async () => {
    const { familyId, userId } = await requireRole(["owner", "admin"]);

    const newToken = generateShareToken();

    await db
      .update(schema.families)
      .set({
        shareToken: newToken,
        updatedAt: new Date(),
      })
      .where(eq(schema.families.id, familyId));

    // Audit log for share token regeneration (security-sensitive operation)
    await logAudit({
      familyId,
      userId,
      action: "update",
      entityType: "family",
      entityId: familyId,
      oldValue: { shareToken: "[REDACTED - old token invalidated]" },
      newValue: {
        shareToken: "[REDACTED - new token generated]",
        regeneratedAt: new Date().toISOString(),
      },
    });

    return { shareToken: newToken };
  }
);

/**
 * Get current share token (requires auth - admin only)
 */
export const getShareToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const { familyId } = await requireRole(["owner", "admin"]);

    const [family] = await db
      .select({ shareToken: schema.families.shareToken })
      .from(schema.families)
      .where(eq(schema.families.id, familyId))
      .limit(1);

    return { shareToken: family?.shareToken || null };
  }
);
