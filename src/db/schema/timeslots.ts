import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  varchar,
  integer,
  index,
  uniqueIndex,
  time,
} from "drizzle-orm/pg-core";
import { families } from "./families";
import { members } from "./members";

export const recurrenceTypeEnum = ["daily", "weekly", "monthly", "none"] as const;
export type RecurrenceType = (typeof recurrenceTypeEnum)[number];

export const timeslots = pgTable(
  "timeslots",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    recurrenceType: varchar("recurrence_type", { length: 20 })
      .default("daily")
      .notNull()
      .$type<RecurrenceType>(),
    recurrenceDays: varchar("recurrence_days", { length: 50 }), // CSV: "0,1,2,3,4,5,6"
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_timeslots_family").on(table.familyId),
    index("idx_timeslots_family_active").on(table.familyId, table.isActive),
  ]
);

// Junction table: timeslot <-> member (many-to-many)
export const timeslotMembers = pgTable(
  "timeslot_members",
  {
    id: serial("id").primaryKey(),
    timeslotId: integer("timeslot_id")
      .notNull()
      .references(() => timeslots.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_timeslot_member_unique").on(table.timeslotId, table.memberId),
    index("idx_timeslot_members_timeslot").on(table.timeslotId),
    index("idx_timeslot_members_member").on(table.memberId),
  ]
);

export type Timeslot = typeof timeslots.$inferSelect;
export type NewTimeslot = typeof timeslots.$inferInsert;
export type TimeslotMember = typeof timeslotMembers.$inferSelect;
export type NewTimeslotMember = typeof timeslotMembers.$inferInsert;
