import {
  pgTable,
  serial,
  timestamp,
  integer,
  index,
  uniqueIndex,
  date,
} from "drizzle-orm/pg-core";
import { todos } from "./todos";
import { timeslots } from "./timeslots";
import { members } from "./members";

// Track individual todo completions
export const todoCompletions = pgTable(
  "todo_completions",
  {
    id: serial("id").primaryKey(),
    todoId: integer("todo_id")
      .notNull()
      .references(() => todos.id, { onDelete: "cascade" }),
    timeslotId: integer("timeslot_id")
      .notNull()
      .references(() => timeslots.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    completionDate: date("completion_date").notNull(),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
  },
  (table) => [
    // Prevent duplicate completions for same todo/timeslot/member/date
    uniqueIndex("idx_todo_completion_unique").on(
      table.todoId,
      table.timeslotId,
      table.memberId,
      table.completionDate
    ),
    index("idx_todo_completions_date").on(table.completionDate),
    index("idx_todo_completions_member_date").on(table.memberId, table.completionDate),
  ]
);

// Track entire timeslot completions (when all todos in a timeslot are done)
export const timeslotCompletions = pgTable(
  "timeslot_completions",
  {
    id: serial("id").primaryKey(),
    timeslotId: integer("timeslot_id")
      .notNull()
      .references(() => timeslots.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    completionDate: date("completion_date").notNull(),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_timeslot_completion_unique").on(
      table.timeslotId,
      table.memberId,
      table.completionDate
    ),
    index("idx_timeslot_completions_date").on(table.completionDate),
  ]
);

export type TodoCompletion = typeof todoCompletions.$inferSelect;
export type NewTodoCompletion = typeof todoCompletions.$inferInsert;
export type TimeslotCompletion = typeof timeslotCompletions.$inferSelect;
export type NewTimeslotCompletion = typeof timeslotCompletions.$inferInsert;
