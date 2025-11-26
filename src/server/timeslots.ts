import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, asc, inArray } from "drizzle-orm";
import { db, schema } from "../db";
import type { RecurrenceType } from "../db/schema";

// For now, we'll use a default family ID of 1
// This will be replaced with session-based family ID in multi-tenancy phase
const DEFAULT_FAMILY_ID = 1;

/**
 * Check if a timeslot should be shown on a given day of week
 * @param recurrenceType - 'daily', 'weekly', 'monthly', or 'none'
 * @param recurrenceDays - CSV of numeric days: "0,1,2,3,4,5,6" (0=Sunday, 6=Saturday)
 * @param dayOfWeek - Day of week from Date.getDay() (0=Sunday, 6=Saturday)
 */
function shouldShowTimeslotOnDay(
  recurrenceType: string,
  recurrenceDays: string | null,
  dayOfWeek: number
): boolean {
  switch (recurrenceType) {
    case "daily":
      return true;
    case "weekly":
      if (!recurrenceDays) return true;
      const days = recurrenceDays.split(",").map((d) => parseInt(d.trim(), 10));
      return days.includes(dayOfWeek);
    case "monthly":
      // For now, show every day (can be enhanced later)
      return true;
    case "none":
      return true;
    default:
      return true;
  }
}

const GetTimeslotsSchema = z.object({
  memberId: z.number().optional(),
  date: z.string().optional(), // YYYY-MM-DD format for server-side recurrence filtering
});

export const getTimeslots = createServerFn({ method: "GET" })
  .inputValidator(GetTimeslotsSchema)
  .handler(async ({ data }) => {
    // Get active timeslots for the family
    const timeslots = await db
      .select()
      .from(schema.timeslots)
      .where(
        and(
          eq(schema.timeslots.familyId, DEFAULT_FAMILY_ID),
          eq(schema.timeslots.isActive, true)
        )
      )
      .orderBy(asc(schema.timeslots.startTime));

    // Get all member assignments for these timeslots
    const timeslotIds = timeslots.map((t) => t.id);

    let timeslotMembersMap: Map<number, number[]> = new Map();

    if (timeslotIds.length > 0) {
      const timeslotMembers = await db
        .select()
        .from(schema.timeslotMembers)
        .where(inArray(schema.timeslotMembers.timeslotId, timeslotIds));

      // Group member IDs by timeslot
      for (const tm of timeslotMembers) {
        const existing = timeslotMembersMap.get(tm.timeslotId) || [];
        existing.push(tm.memberId);
        timeslotMembersMap.set(tm.timeslotId, existing);
      }
    }

    // Combine timeslots with their member IDs
    let timeslotsWithMembers = timeslots.map((timeslot) => ({
      ...timeslot,
      memberIds: timeslotMembersMap.get(timeslot.id) || [],
    }));

    // Filter by date/recurrence if specified (server-side filtering)
    if (data.date) {
      // Parse date and get day of week (0=Sunday, 6=Saturday)
      // Use UTC to avoid timezone issues
      const [year, month, day] = data.date.split("-").map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dateObj.getUTCDay();

      timeslotsWithMembers = timeslotsWithMembers.filter((t) =>
        shouldShowTimeslotOnDay(t.recurrenceType, t.recurrenceDays, dayOfWeek)
      );
    }

    // Filter by member if specified
    if (data.memberId) {
      timeslotsWithMembers = timeslotsWithMembers.filter((t) =>
        t.memberIds.includes(data.memberId!)
      );
    }

    return timeslotsWithMembers;
  });

const CreateTimeslotSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  recurrenceType: z.enum(["daily", "weekly", "monthly", "none"]).optional(),
  recurrenceDays: z.string().optional(),
  memberIds: z.array(z.number()).min(1),
});

export const createTimeslot = createServerFn({ method: "POST" })
  .inputValidator(CreateTimeslotSchema)
  .handler(async ({ data }) => {
    // Insert the timeslot
    const [timeslot] = await db
      .insert(schema.timeslots)
      .values({
        familyId: DEFAULT_FAMILY_ID,
        name: data.name,
        description: data.description || null,
        startTime: data.startTime,
        endTime: data.endTime,
        recurrenceType: (data.recurrenceType || "none") as RecurrenceType,
        recurrenceDays: data.recurrenceDays || null,
      })
      .returning();

    // Insert member assignments
    if (data.memberIds.length > 0) {
      await db.insert(schema.timeslotMembers).values(
        data.memberIds.map((memberId) => ({
          timeslotId: timeslot.id,
          memberId,
        }))
      );
    }

    return {
      ...timeslot,
      memberIds: data.memberIds,
    };
  });

const UpdateTimeslotSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  recurrenceType: z.enum(["daily", "weekly", "monthly", "none"]).optional(),
  recurrenceDays: z.string().optional(),
  isActive: z.boolean().optional(),
  memberIds: z.array(z.number()).optional(),
});

export const updateTimeslot = createServerFn({ method: "POST" })
  .inputValidator(UpdateTimeslotSchema)
  .handler(async ({ data }) => {
    const updateData: Partial<{
      name: string;
      description: string | null;
      startTime: string;
      endTime: string;
      recurrenceType: RecurrenceType;
      recurrenceDays: string | null;
      isActive: boolean;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.recurrenceType !== undefined)
      updateData.recurrenceType = data.recurrenceType;
    if (data.recurrenceDays !== undefined)
      updateData.recurrenceDays = data.recurrenceDays;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [timeslot] = await db
      .update(schema.timeslots)
      .set(updateData)
      .where(
        and(
          eq(schema.timeslots.id, data.id),
          eq(schema.timeslots.familyId, DEFAULT_FAMILY_ID)
        )
      )
      .returning();

    // Update member assignments if provided
    if (data.memberIds !== undefined) {
      // Delete existing assignments
      await db
        .delete(schema.timeslotMembers)
        .where(eq(schema.timeslotMembers.timeslotId, data.id));

      // Insert new assignments
      if (data.memberIds.length > 0) {
        await db.insert(schema.timeslotMembers).values(
          data.memberIds.map((memberId) => ({
            timeslotId: data.id,
            memberId,
          }))
        );
      }
    }

    // Get updated member assignments
    const memberAssignments = await db
      .select()
      .from(schema.timeslotMembers)
      .where(eq(schema.timeslotMembers.timeslotId, data.id));

    return {
      ...timeslot,
      memberIds: memberAssignments.map((m) => m.memberId),
    };
  });

const DeleteTimeslotSchema = z.object({
  id: z.number(),
});

export const deleteTimeslot = createServerFn({ method: "POST" })
  .inputValidator(DeleteTimeslotSchema)
  .handler(async ({ data }) => {
    await db
      .delete(schema.timeslots)
      .where(
        and(
          eq(schema.timeslots.id, data.id),
          eq(schema.timeslots.familyId, DEFAULT_FAMILY_ID)
        )
      );

    return { success: true };
  });

// Re-export types for backwards compatibility
export type { Timeslot, TimeslotMember } from "../db/schema";
