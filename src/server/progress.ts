import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db";
import { getTenantContext } from "../utils/tenant";

const GetWeeklyProgressSchema = z.object({
  memberId: z.number(),
  startDate: z.string(), // ISO date string (YYYY-MM-DD)
});

/**
 * Get weekly progress for a member - REQUIRES tenant context
 */
export const getWeeklyProgress = createServerFn({ method: "GET" })
  .inputValidator(GetWeeklyProgressSchema)
  .handler(async ({ data }) => {
    const { memberId, startDate } = data;

    // SECURITY: Verify user is authenticated and member belongs to their family
    const { familyId } = await getTenantContext();

    const [member] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, memberId),
          eq(schema.members.familyId, familyId)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found or access denied");
    }

    // Generate array of 7 dates starting from startDate
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date.toISOString().split("T")[0];
    });

    // Get completions for the week
    const weekData = await Promise.all(
      dates.map(async (date) => {
        const completions = await db
          .select()
          .from(schema.todoCompletions)
          .where(
            and(
              eq(schema.todoCompletions.memberId, memberId),
              eq(schema.todoCompletions.completionDate, date)
            )
          );

        const timeslotCompletions = await db
          .select({ id: schema.timeslotCompletions.id })
          .from(schema.timeslotCompletions)
          .where(
            and(
              eq(schema.timeslotCompletions.memberId, memberId),
              eq(schema.timeslotCompletions.completionDate, date)
            )
          );

        return {
          date,
          taskCount: completions.length,
          timeslotCount: timeslotCompletions.length,
        };
      })
    );

    return weekData;
  });
