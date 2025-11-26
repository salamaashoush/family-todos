import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { families } from "./families";
import { timeslots } from "./timeslots";

export const todos = pgTable(
  "todos",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    symbol: varchar("symbol", { length: 50 }),
    position: integer("position").default(0).notNull(),
    points: integer("points").default(5).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_todos_family").on(table.familyId),
    index("idx_todos_family_position").on(table.familyId, table.position),
  ]
);

// Junction table: todo <-> timeslot (many-to-many)
export const todoTimeslots = pgTable(
  "todo_timeslots",
  {
    id: serial("id").primaryKey(),
    todoId: integer("todo_id")
      .notNull()
      .references(() => todos.id, { onDelete: "cascade" }),
    timeslotId: integer("timeslot_id")
      .notNull()
      .references(() => timeslots.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_todo_timeslot_unique").on(table.todoId, table.timeslotId),
    index("idx_todo_timeslots_todo").on(table.todoId),
    index("idx_todo_timeslots_timeslot").on(table.timeslotId),
  ]
);

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
export type TodoTimeslot = typeof todoTimeslots.$inferSelect;
export type NewTodoTimeslot = typeof todoTimeslots.$inferInsert;
