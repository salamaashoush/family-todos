import { createServerFn } from "@tanstack/react-start";
import { db, type TodoCompletion } from "../db/schema";
import { z } from "zod";

const GetWeeklyProgressSchema = z.object({
  member_id: z.number(),
  start_date: z.string(), // ISO date string (YYYY-MM-DD)
});

export const getWeeklyProgress = createServerFn({ method: "GET" })
  .inputValidator(GetWeeklyProgressSchema)
  .handler(async ({ data }) => {
    const { member_id, start_date } = data;

    // Generate array of 7 dates starting from start_date
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start_date);
      date.setDate(date.getDate() + i);
      return date.toISOString().split("T")[0];
    });

    // Get completions for the week
    const weekData = dates.map((date) => {
      const completions = db
        .query<
          TodoCompletion,
          [number, string]
        >("SELECT * FROM todo_completions WHERE member_id = ? AND completion_date = ?")
        .all(member_id, date);

      const timeslotCompletions = db
        .query<
          { id: number },
          [number, string]
        >("SELECT id FROM timeslot_completions WHERE member_id = ? AND completion_date = ?")
        .all(member_id, date);

      return {
        date,
        task_count: completions.length,
        timeslot_count: timeslotCompletions.length,
      };
    });

    return weekData;
  });
