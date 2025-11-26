import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { families } from "./families";
import { members } from "./members";
import { todos } from "./todos";

// Reward definitions
export const rewards = pgTable(
  "rewards",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 100 }),
    pointCost: integer("point_cost").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_rewards_family").on(table.familyId),
  ]
);

// Point transaction types
export const transactionTypeEnum = ["earned", "redeemed", "bonus", "adjustment"] as const;
export type TransactionType = (typeof transactionTypeEnum)[number];

// Ledger of all point changes
export const pointTransactions = pgTable(
  "point_transactions",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(), // Can be negative for deductions
    type: varchar("type", { length: 20 }).notNull().$type<TransactionType>(),
    description: text("description"),
    todoId: integer("todo_id").references(() => todos.id, { onDelete: "set null" }),
    rewardId: integer("reward_id").references(() => rewards.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_point_transactions_member").on(table.memberId),
    index("idx_point_transactions_type").on(table.type),
  ]
);

// Redemption status types
export const redemptionStatusEnum = ["pending", "approved", "rejected", "fulfilled"] as const;
export type RedemptionStatus = (typeof redemptionStatusEnum)[number];

// Reward redemption requests
export const rewardRedemptions = pgTable(
  "reward_redemptions",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    rewardId: integer("reward_id")
      .notNull()
      .references(() => rewards.id, { onDelete: "cascade" }),
    pointsSpent: integer("points_spent").notNull(),
    status: varchar("status", { length: 20 })
      .default("pending")
      .notNull()
      .$type<RedemptionStatus>(),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
    processedBy: integer("processed_by"), // admin_user id (no FK to avoid circular dep)
    notes: text("notes"),
  },
  (table) => [
    index("idx_reward_redemptions_member").on(table.memberId),
    index("idx_reward_redemptions_status").on(table.status),
  ]
);

export type Reward = typeof rewards.$inferSelect;
export type NewReward = typeof rewards.$inferInsert;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type NewPointTransaction = typeof pointTransactions.$inferInsert;
export type RewardRedemption = typeof rewardRedemptions.$inferSelect;
export type NewRewardRedemption = typeof rewardRedemptions.$inferInsert;
