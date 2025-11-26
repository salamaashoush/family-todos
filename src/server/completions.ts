import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, sql, count } from "drizzle-orm";
import { db, schema } from "../db";
import { updateStats } from "./statistics";
import { revokeUnqualifiedAchievements } from "./statistics-helpers";
import { broadcastToFamily } from "./realtime";
import { getTenantContext } from "../utils/tenant";

/**
 * Check if a timeslot is scheduled for a given date based on recurrence rules
 * @param recurrenceType - 'daily', 'weekly', 'monthly', or 'none'
 * @param recurrenceDays - CSV of numeric days: "0,1,2,3,4,5,6" (0=Sunday, 6=Saturday)
 * @param dateString - Date in YYYY-MM-DD format
 */
function isTimeslotScheduledForDate(
  recurrenceType: string,
  recurrenceDays: string | null,
  dateString: string
): boolean {
  switch (recurrenceType) {
    case "daily":
      return true;
    case "weekly":
      if (!recurrenceDays) return true;
      // Parse date as UTC to get consistent day of week
      const [year, month, day] = dateString.split("-").map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dateObj.getUTCDay();
      const days = recurrenceDays.split(",").map((d) => parseInt(d.trim(), 10));
      return days.includes(dayOfWeek);
    case "monthly":
      return true;
    case "none":
      return true;
    default:
      return true;
  }
}

const GetCompletionsSchema = z.object({
  date: z.string().optional(),
  memberId: z.number().optional(),
});

/**
 * Get todo completions - REQUIRES tenant context
 * Only returns completions for members in the current family
 */
export const getTodoCompletions = createServerFn({ method: "GET" })
  .inputValidator(GetCompletionsSchema)
  .handler(async ({ data }) => {
    // SECURITY: Require authentication and get family context
    const { familyId } = await getTenantContext();

    const date = data.date || new Date().toISOString().split("T")[0];

    // Get members for this family to filter completions
    const familyMembers = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.familyId, familyId));

    const memberIds = familyMembers.map((m) => m.id);

    if (memberIds.length === 0) {
      return [];
    }

    // If specific memberId requested, verify it belongs to family
    if (data.memberId && !memberIds.includes(data.memberId)) {
      throw new Error("Member not found or access denied");
    }

    const conditions = [eq(schema.todoCompletions.completionDate, date)];

    if (data.memberId) {
      conditions.push(eq(schema.todoCompletions.memberId, data.memberId));
    }

    const completions = await db
      .select()
      .from(schema.todoCompletions)
      .where(and(...conditions));

    // Filter to only family members
    return completions.filter((c) => memberIds.includes(c.memberId));
  });

/**
 * Get timeslot completions - REQUIRES tenant context
 * Only returns completions for members in the current family
 */
export const getTimeslotCompletions = createServerFn({ method: "GET" })
  .inputValidator(GetCompletionsSchema)
  .handler(async ({ data }) => {
    // SECURITY: Require authentication and get family context
    const { familyId } = await getTenantContext();

    const date = data.date || new Date().toISOString().split("T")[0];

    // Get members for this family to filter completions
    const familyMembers = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.familyId, familyId));

    const memberIds = familyMembers.map((m) => m.id);

    if (memberIds.length === 0) {
      return [];
    }

    // If specific memberId requested, verify it belongs to family
    if (data.memberId && !memberIds.includes(data.memberId)) {
      throw new Error("Member not found or access denied");
    }

    const conditions = [eq(schema.timeslotCompletions.completionDate, date)];

    if (data.memberId) {
      conditions.push(eq(schema.timeslotCompletions.memberId, data.memberId));
    }

    const completions = await db
      .select()
      .from(schema.timeslotCompletions)
      .where(and(...conditions));

    // Filter to only family members
    return completions.filter((c) => memberIds.includes(c.memberId));
  });

const CompleteTodoSchema = z.object({
  todoId: z.number(),
  timeslotId: z.number(),
  memberId: z.number(),
  completionDate: z.string().optional(),
  clientId: z.string().nullish(),
});

/**
 * Complete a todo - REQUIRES tenant context and validates family ownership
 */
export const completeTodo = createServerFn({ method: "POST" })
  .inputValidator(CompleteTodoSchema)
  .handler(async ({ data }) => {
    // SECURITY: Require authentication and verify family ownership
    const { familyId } = await getTenantContext();

    const completionDate =
      data.completionDate || new Date().toISOString().split("T")[0];

    // SECURITY: Verify member belongs to user's family
    const [member] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, familyId)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found or access denied");
    }

    // SECURITY: Verify todo belongs to user's family
    const [todo] = await db
      .select({ id: schema.todos.id, familyId: schema.todos.familyId })
      .from(schema.todos)
      .where(eq(schema.todos.id, data.todoId))
      .limit(1);

    if (!todo || todo.familyId !== familyId) {
      throw new Error("Todo not found or access denied");
    }

    // SECURITY: Verify timeslot belongs to user's family
    const [timeslot] = await db
      .select()
      .from(schema.timeslots)
      .where(eq(schema.timeslots.id, data.timeslotId))
      .limit(1);

    if (!timeslot || timeslot.familyId !== familyId) {
      throw new Error("Timeslot not found or access denied");
    }

    // Validate that todo belongs to the specified timeslot
    const [todoTimeslot] = await db
      .select()
      .from(schema.todoTimeslots)
      .where(
        and(
          eq(schema.todoTimeslots.todoId, data.todoId),
          eq(schema.todoTimeslots.timeslotId, data.timeslotId)
        )
      )
      .limit(1);

    if (!todoTimeslot) {
      throw new Error("Todo does not belong to the specified timeslot");
    }

    // Validate that member is assigned to the specified timeslot
    const [timeslotMember] = await db
      .select()
      .from(schema.timeslotMembers)
      .where(
        and(
          eq(schema.timeslotMembers.timeslotId, data.timeslotId),
          eq(schema.timeslotMembers.memberId, data.memberId)
        )
      )
      .limit(1);

    if (!timeslotMember) {
      throw new Error("Member is not assigned to the specified timeslot");
    }

    if (!isTimeslotScheduledForDate(timeslot.recurrenceType, timeslot.recurrenceDays, completionDate)) {
      throw new Error("Timeslot is not scheduled for this date");
    }

    // Check if already completed
    const [existing] = await db
      .select()
      .from(schema.todoCompletions)
      .where(
        and(
          eq(schema.todoCompletions.todoId, data.todoId),
          eq(schema.todoCompletions.timeslotId, data.timeslotId),
          eq(schema.todoCompletions.memberId, data.memberId),
          eq(schema.todoCompletions.completionDate, completionDate)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    try {
      // Insert the completion
      const [completion] = await db
        .insert(schema.todoCompletions)
        .values({
          todoId: data.todoId,
          timeslotId: data.timeslotId,
          memberId: data.memberId,
          completionDate: completionDate,
        })
        .returning();

      // Get todo for points and title
      const [todo] = await db
        .select()
        .from(schema.todos)
        .where(eq(schema.todos.id, data.todoId))
        .limit(1);

      // Award points for completing this task
      if (todo && todo.points > 0) {
        await db.insert(schema.pointTransactions).values({
          memberId: data.memberId,
          amount: todo.points,
          type: "earned",
          description: `Completed: ${todo.title}`,
          todoId: data.todoId,
        });
      }

      // Check and complete the timeslot this todo belongs to
      await checkAndCompleteTimeslot(
        data.timeslotId,
        data.memberId,
        completionDate
      );

      // Update statistics and check achievements
      await updateStats({
        data: { memberId: data.memberId, completionDate: completionDate },
      });

      // Broadcast realtime event
      const [member] = await db
        .select({ name: schema.members.name, familyId: schema.members.familyId })
        .from(schema.members)
        .where(eq(schema.members.id, data.memberId))
        .limit(1);

      if (member) {
        broadcastToFamily(member.familyId, {
          type: "task_completed",
          sourceClientId: data.clientId ?? undefined,
          memberId: data.memberId,
          timestamp: Date.now(),
          memberName: member.name,
          data: { todoId: data.todoId, timeslotId: data.timeslotId },
        });
      }

      return completion;
    } catch {
      throw new Error("Completion already exists or invalid data");
    }
  });

const UncompleteTodoSchema = z.object({
  todoId: z.number(),
  timeslotId: z.number(),
  memberId: z.number(),
  completionDate: z.string().optional(),
  clientId: z.string().nullish(),
});

/**
 * Uncomplete a todo - REQUIRES tenant context and validates family ownership
 */
export const uncompleteTodo = createServerFn({ method: "POST" })
  .inputValidator(UncompleteTodoSchema)
  .handler(async ({ data }) => {
    // SECURITY: Require authentication and verify family ownership
    const { familyId } = await getTenantContext();

    const completionDate =
      data.completionDate || new Date().toISOString().split("T")[0];

    // SECURITY: Verify member belongs to user's family
    const [member] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, familyId)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found or access denied");
    }

    // SECURITY: Verify todo belongs to user's family
    const [todo] = await db
      .select({ id: schema.todos.id, familyId: schema.todos.familyId })
      .from(schema.todos)
      .where(eq(schema.todos.id, data.todoId))
      .limit(1);

    if (!todo || todo.familyId !== familyId) {
      throw new Error("Todo not found or access denied");
    }

    // Delete the completion and check if anything was deleted
    const deleted = await db
      .delete(schema.todoCompletions)
      .where(
        and(
          eq(schema.todoCompletions.todoId, data.todoId),
          eq(schema.todoCompletions.timeslotId, data.timeslotId),
          eq(schema.todoCompletions.memberId, data.memberId),
          eq(schema.todoCompletions.completionDate, completionDate)
        )
      )
      .returning();

    const wasDeleted = deleted.length > 0;

    // Only decrement stats if something was actually deleted
    if (wasDeleted) {
      // Decrement stats
      await db
        .update(schema.memberStats)
        .set({
          totalStars: sql`GREATEST(0, ${schema.memberStats.totalStars} - 1)`,
          totalTasksCompleted: sql`GREATEST(0, ${schema.memberStats.totalTasksCompleted} - 1)`,
          updatedAt: new Date(),
        })
        .where(eq(schema.memberStats.memberId, data.memberId));

      // Get todo for points and title
      const [todo] = await db
        .select()
        .from(schema.todos)
        .where(eq(schema.todos.id, data.todoId))
        .limit(1);

      // Remove points for uncompleting this task
      if (todo && todo.points > 0) {
        await db.insert(schema.pointTransactions).values({
          memberId: data.memberId,
          amount: -todo.points,
          type: "adjustment",
          description: `Uncompleted: ${todo.title}`,
          todoId: data.todoId,
        });
      }
    }

    // Remove timeslot completion if this was completing the timeslot
    const deletedTimeslot = await db
      .delete(schema.timeslotCompletions)
      .where(
        and(
          eq(schema.timeslotCompletions.timeslotId, data.timeslotId),
          eq(schema.timeslotCompletions.memberId, data.memberId),
          eq(schema.timeslotCompletions.completionDate, completionDate)
        )
      )
      .returning();

    // Decrement timeslot completion count if something was deleted
    if (deletedTimeslot.length > 0) {
      await db
        .update(schema.memberStats)
        .set({
          totalTimeslotsCompleted: sql`GREATEST(0, ${schema.memberStats.totalTimeslotsCompleted} - 1)`,
          updatedAt: new Date(),
        })
        .where(eq(schema.memberStats.memberId, data.memberId));
    }

    // Revoke achievements that the member no longer qualifies for
    if (wasDeleted) {
      await revokeUnqualifiedAchievements(data.memberId);
    }

    // Broadcast realtime event
    if (wasDeleted) {
      const [member] = await db
        .select({ name: schema.members.name, familyId: schema.members.familyId })
        .from(schema.members)
        .where(eq(schema.members.id, data.memberId))
        .limit(1);

      if (member) {
        broadcastToFamily(member.familyId, {
          type: "task_uncompleted",
          sourceClientId: data.clientId ?? undefined,
          memberId: data.memberId,
          timestamp: Date.now(),
          memberName: member.name,
          data: { todoId: data.todoId, timeslotId: data.timeslotId },
        });
      }
    }

    return { success: true };
  });

async function checkAndCompleteTimeslot(
  timeslotId: number,
  memberId: number,
  completionDate: string
) {
  // Get total todos for this timeslot via the junction table
  const [totalTodosResult] = await db
    .select({ count: count() })
    .from(schema.todoTimeslots)
    .where(eq(schema.todoTimeslots.timeslotId, timeslotId));

  const totalTodos = totalTodosResult?.count || 0;

  // Get completed todos for this specific timeslot, member, and date
  // Important: Filter by BOTH the junction table (todo belongs to timeslot)
  // AND the completion's timeslotId (completion was made for this timeslot)
  const [completedTodosResult] = await db
    .select({ count: count() })
    .from(schema.todoCompletions)
    .innerJoin(
      schema.todoTimeslots,
      and(
        eq(schema.todoCompletions.todoId, schema.todoTimeslots.todoId),
        eq(schema.todoTimeslots.timeslotId, timeslotId)
      )
    )
    .where(
      and(
        eq(schema.todoCompletions.timeslotId, timeslotId),
        eq(schema.todoCompletions.memberId, memberId),
        eq(schema.todoCompletions.completionDate, completionDate)
      )
    );

  const completedTodos = completedTodosResult?.count || 0;

  // If all todos are completed, mark the timeslot as complete
  if (totalTodos > 0 && totalTodos === completedTodos) {
    try {
      const [inserted] = await db
        .insert(schema.timeslotCompletions)
        .values({
          timeslotId,
          memberId,
          completionDate,
        })
        .returning();

      // Update timeslot completion stats if this is a new completion
      if (inserted) {
        await db
          .update(schema.memberStats)
          .set({
            totalTimeslotsCompleted: sql`${schema.memberStats.totalTimeslotsCompleted} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(schema.memberStats.memberId, memberId));

        // Broadcast timeslot completion event
        const [member] = await db
          .select({ name: schema.members.name, familyId: schema.members.familyId })
          .from(schema.members)
          .where(eq(schema.members.id, memberId))
          .limit(1);

        if (member) {
          broadcastToFamily(member.familyId, {
            type: "timeslot_completed",
            memberId,
            memberName: member.name,
            timestamp: Date.now(),
            data: { timeslotId: timeslotId },
          });
        }
      }
    } catch {
      // Ignore duplicate errors (timeslot already completed)
    }
  }
}

// Re-export types for backwards compatibility
export type { TodoCompletion, TimeslotCompletion } from "../db/schema";
