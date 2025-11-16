import { createServerFn } from "@tanstack/react-start";
import { db, type TodoCompletion, type TimeslotCompletion } from "../db/schema";
import { z } from "zod";
import { updateStats } from "./statistics";

const GetCompletionsSchema = z.object({
  date: z.string().optional(),
  member_id: z.number().optional(),
});

export const getTodoCompletions = createServerFn({ method: "GET" })
  .inputValidator(GetCompletionsSchema)
  .handler(async ({ data }) => {
    const date = data.date || new Date().toISOString().split("T")[0];

    let query = "SELECT * FROM todo_completions WHERE completion_date = ?";
    const params: (string | number)[] = [date];

    if (data.member_id) {
      query += " AND member_id = ?";
      params.push(data.member_id);
    }

    const completions = db
      .query<TodoCompletion, (string | number)[]>(query)
      .all(...params);
    return completions;
  });

export const getTimeslotCompletions = createServerFn({ method: "GET" })
  .inputValidator(GetCompletionsSchema)
  .handler(async ({ data }) => {
    const date = data.date || new Date().toISOString().split("T")[0];

    let query = "SELECT * FROM timeslot_completions WHERE completion_date = ?";
    const params: (string | number)[] = [date];

    if (data.member_id) {
      query += " AND member_id = ?";
      params.push(data.member_id);
    }

    const completions = db
      .query<TimeslotCompletion, (string | number)[]>(query)
      .all(...params);
    return completions;
  });

const CompleteTodoSchema = z.object({
  todo_id: z.number(),
  member_id: z.number(),
  completion_date: z.string().optional(),
});

export const completeTodo = createServerFn({ method: "POST" })
  .inputValidator(CompleteTodoSchema)
  .handler(async ({ data }) => {
    const completionDate =
      data.completion_date || new Date().toISOString().split("T")[0];

    // Check if already completed
    const existing = db
      .query<TodoCompletion, [number, number, string]>(
        "SELECT * FROM todo_completions WHERE todo_id = ? AND member_id = ? AND completion_date = ?"
      )
      .get(data.todo_id, data.member_id, completionDate);

    if (existing) {
      return existing;
    }

    try {
      const result = db.run(
        `INSERT INTO todo_completions (todo_id, member_id, completion_date)
         VALUES (?, ?, ?)`,
        [data.todo_id, data.member_id, completionDate]
      );

      const completion = db
        .query<
          TodoCompletion,
          [number]
        >("SELECT * FROM todo_completions WHERE id = ?")
        .get(result.lastInsertRowid as number);

      // Get all timeslots associated with this todo
      const timeslots = db
        .query<
          { timeslot_id: number },
          [number]
        >("SELECT timeslot_id FROM todo_timeslots WHERE todo_id = ?")
        .all(data.todo_id);

      // Check and complete each associated timeslot
      for (const { timeslot_id } of timeslots) {
        checkAndCompleteTimeslot(
          timeslot_id,
          data.member_id,
          completionDate
        );
      }

      // Update statistics and check achievements
      await updateStats({ data: { member_id: data.member_id, completion_date: completionDate } });

      return completion;
    } catch {
      throw new Error("Completion already exists or invalid data");
    }
  });

const UncompleteTodoSchema = z.object({
  todo_id: z.number(),
  member_id: z.number(),
  completion_date: z.string().optional(),
});

export const uncompleteTodo = createServerFn({ method: "POST" })
  .inputValidator(UncompleteTodoSchema)
  .handler(async ({ data }) => {
    const completionDate =
      data.completion_date || new Date().toISOString().split("T")[0];

    const deleted = db.run(
      "DELETE FROM todo_completions WHERE todo_id = ? AND member_id = ? AND completion_date = ?",
      [data.todo_id, data.member_id, completionDate]
    );

    // Only decrement stats if something was actually deleted
    if (deleted.changes > 0) {
      // Decrement stats
      db.run(
        `UPDATE member_stats
         SET total_stars = GREATEST(0, total_stars - 1),
             total_tasks_completed = GREATEST(0, total_tasks_completed - 1),
             updated_at = CURRENT_TIMESTAMP
         WHERE member_id = ?`,
        [data.member_id]
      );
    }

    // Get all timeslots associated with this todo
    const timeslots = db
      .query<
        { timeslot_id: number },
        [number]
      >("SELECT timeslot_id FROM todo_timeslots WHERE todo_id = ?")
      .all(data.todo_id);

    // Remove timeslot completions for each associated timeslot
    for (const { timeslot_id } of timeslots) {
      db.run(
        "DELETE FROM timeslot_completions WHERE timeslot_id = ? AND member_id = ? AND completion_date = ?",
        [timeslot_id, data.member_id, completionDate]
      );
    }

    return { success: true };
  });

function checkAndCompleteTimeslot(
  timeslotId: number,
  memberId: number,
  completionDate: string
) {
  // Get total todos for this timeslot via the junction table
  const totalTodos = db
    .query<
      { count: number },
      [number]
    >("SELECT COUNT(*) as count FROM todo_timeslots WHERE timeslot_id = ?")
    .get(timeslotId);

  // Get completed todos for this timeslot
  const completedTodos = db
    .query<{ count: number }, [number, number, string]>(
      `SELECT COUNT(*) as count
     FROM todo_completions tc
     JOIN todo_timeslots tt ON tc.todo_id = tt.todo_id
     WHERE tt.timeslot_id = ? AND tc.member_id = ? AND tc.completion_date = ?`
    )
    .get(timeslotId, memberId, completionDate);

  if (
    totalTodos &&
    completedTodos &&
    totalTodos.count > 0 &&
    totalTodos.count === completedTodos.count
  ) {
    try {
      db.run(
        `INSERT INTO timeslot_completions (timeslot_id, member_id, completion_date)
         VALUES (?, ?, ?)`,
        [timeslotId, memberId, completionDate]
      );
    } catch {
      // Ignore duplicate errors
    }
  }
}
