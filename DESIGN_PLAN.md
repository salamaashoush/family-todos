# Multi-Tenancy and Onboarding Design Plan

## Executive Summary

This document outlines the architectural changes required to transform the Family Todos application from a single-family system into a multi-tenant SaaS platform with dynamic onboarding, including migration to Drizzle ORM for improved maintainability.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Drizzle ORM Migration](#2-drizzle-orm-migration)
3. [Multi-Tenancy Architecture](#3-multi-tenancy-architecture)
4. [Onboarding Flow](#4-onboarding-flow)
5. [Implementation Phases](#5-implementation-phases)
6. [Database Schema Changes](#6-database-schema-changes)
7. [API Changes](#7-api-changes)
8. [Security Considerations](#8-security-considerations)

---

## 1. Current State Analysis

### Database Layer
- **Engine:** Bun's native SQLite (`bun:sqlite`)
- **Pattern:** Raw SQL queries with manual type annotations
- **Migrations:** Try-catch pattern for ALTER statements (no formal migration system)
- **Location:** `src/db/schema.ts` (~550 lines of SQL)

### Data Model Issues for Multi-Tenancy
```
Current: All data in single namespace
- members (4 hardcoded)
- timeslots (6 hardcoded)
- todos (10 hardcoded)
- No family/tenant isolation
- Single admin pool
```

### Authentication
- Session-based with encrypted cookies
- Single admin_users table (no tenant association)
- No user registration flow

---

## 2. Drizzle ORM Migration

### 2.1 Why Drizzle?

| Feature | Current (Raw SQL) | Drizzle ORM |
|---------|-------------------|-------------|
| Type Safety | Manual `<Type, Params[]>` | Compile-time checking |
| Migrations | Try-catch ALTER | Versioned migration files |
| Query Building | String concatenation | Type-safe builder |
| Relations | Manual JOINs | Declarative relations |
| IDE Support | None | Full autocomplete |

### 2.2 Installation

```bash
bun add drizzle-orm
bun add -D drizzle-kit
```

### 2.3 Directory Structure

```
src/
  db/
    index.ts           # Database connection
    schema/
      index.ts         # Export all schemas
      families.ts      # Family/tenant schema
      members.ts       # Members schema
      timeslots.ts     # Timeslots schema
      todos.ts         # Todos schema
      completions.ts   # Completion tracking
      rewards.ts       # Rewards system
      auth.ts          # Admin users & sessions
      settings.ts      # Layout settings
    relations.ts       # All table relations
    migrations/        # Generated migrations
drizzle.config.ts      # Drizzle Kit config
```

### 2.4 Drizzle Configuration

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema/*",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_PATH || "./family-todos.db",
  },
} satisfies Config;
```

### 2.5 Schema Definitions

```typescript
// src/db/schema/families.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const families = sqliteTable("families", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  subscriptionTier: text("subscription_tier").default("free"),
  isOnboarded: integer("is_onboarded", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
```

```typescript
// src/db/schema/members.ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { families } from "./families";

export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatar: text("avatar"),
  isParent: integer("is_parent", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  familyIdx: index("idx_members_family").on(table.familyId),
}));

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
```

```typescript
// src/db/schema/timeslots.ts
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { families } from "./families";
import { members } from "./members";

export const timeslots = sqliteTable("timeslots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  recurrenceType: text("recurrence_type", {
    enum: ["daily", "weekly", "monthly", "none"]
  }).default("daily"),
  recurrenceDays: text("recurrence_days"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  familyIdx: index("idx_timeslots_family").on(table.familyId),
}));

export const timeslotMembers = sqliteTable("timeslot_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timeslotId: integer("timeslot_id").notNull().references(() => timeslots.id, { onDelete: "cascade" }),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueAssignment: uniqueIndex("idx_timeslot_member_unique").on(table.timeslotId, table.memberId),
  timeslotIdx: index("idx_timeslot_members_timeslot").on(table.timeslotId),
  memberIdx: index("idx_timeslot_members_member").on(table.memberId),
}));

export type Timeslot = typeof timeslots.$inferSelect;
export type NewTimeslot = typeof timeslots.$inferInsert;
```

```typescript
// src/db/schema/todos.ts
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { families } from "./families";
import { timeslots } from "./timeslots";

export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  symbol: text("symbol"),
  position: integer("position").default(0),
  points: integer("points").default(5),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  familyIdx: index("idx_todos_family").on(table.familyId),
}));

export const todoTimeslots = sqliteTable("todo_timeslots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  todoId: integer("todo_id").notNull().references(() => todos.id, { onDelete: "cascade" }),
  timeslotId: integer("timeslot_id").notNull().references(() => timeslots.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueAssignment: uniqueIndex("idx_todo_timeslot_unique").on(table.todoId, table.timeslotId),
  todoIdx: index("idx_todo_timeslots_todo").on(table.todoId),
  timeslotIdx: index("idx_todo_timeslots_timeslot").on(table.timeslotId),
}));

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
```

```typescript
// src/db/schema/completions.ts
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { todos } from "./todos";
import { timeslots } from "./timeslots";
import { members } from "./members";

export const todoCompletions = sqliteTable("todo_completions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  todoId: integer("todo_id").notNull().references(() => todos.id, { onDelete: "cascade" }),
  timeslotId: integer("timeslot_id").notNull().references(() => timeslots.id, { onDelete: "cascade" }),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  completionDate: text("completion_date").notNull(),
  completedAt: text("completed_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueCompletion: uniqueIndex("idx_todo_completion_unique").on(
    table.todoId, table.timeslotId, table.memberId, table.completionDate
  ),
  dateIdx: index("idx_todo_completions_date").on(table.completionDate),
  memberDateIdx: index("idx_todo_completions_member_date").on(table.memberId, table.completionDate),
}));

export const timeslotCompletions = sqliteTable("timeslot_completions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timeslotId: integer("timeslot_id").notNull().references(() => timeslots.id, { onDelete: "cascade" }),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  completionDate: text("completion_date").notNull(),
  completedAt: text("completed_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueCompletion: uniqueIndex("idx_timeslot_completion_unique").on(
    table.timeslotId, table.memberId, table.completionDate
  ),
  dateIdx: index("idx_timeslot_completions_date").on(table.completionDate),
}));

export type TodoCompletion = typeof todoCompletions.$inferSelect;
export type TimeslotCompletion = typeof timeslotCompletions.$inferSelect;
```

```typescript
// src/db/schema/auth.ts
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { families } from "./families";

export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text("last_login_at"),
}, (table) => ({
  usernameIdx: index("idx_admin_users_username").on(table.username),
  emailIdx: index("idx_admin_users_email").on(table.email),
}));

// Junction table for user-family relationships (multi-tenant)
export const userFamilies = sqliteTable("user_families", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  familyId: integer("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "admin", "member"] }).default("admin"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueMembership: uniqueIndex("idx_user_family_unique").on(table.userId, table.familyId),
  userIdx: index("idx_user_families_user").on(table.userId),
  familyIdx: index("idx_user_families_family").on(table.familyId),
}));

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type UserFamily = typeof userFamilies.$inferSelect;
```

```typescript
// src/db/schema/rewards.ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { families } from "./families";
import { members } from "./members";
import { todos } from "./todos";
import { adminUsers } from "./auth";

export const rewards = sqliteTable("rewards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  pointCost: integer("point_cost").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  familyIdx: index("idx_rewards_family").on(table.familyId),
}));

export const pointTransactions = sqliteTable("point_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type", { enum: ["earned", "redeemed", "bonus", "adjustment"] }).notNull(),
  description: text("description"),
  todoId: integer("todo_id").references(() => todos.id, { onDelete: "set null" }),
  rewardId: integer("reward_id").references(() => rewards.id, { onDelete: "set null" }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  memberIdx: index("idx_point_transactions_member").on(table.memberId),
}));

export const rewardRedemptions = sqliteTable("reward_redemptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  rewardId: integer("reward_id").notNull().references(() => rewards.id, { onDelete: "cascade" }),
  pointsSpent: integer("points_spent").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected", "fulfilled"] }).default("pending"),
  requestedAt: text("requested_at").default(sql`CURRENT_TIMESTAMP`),
  processedAt: text("processed_at"),
  processedBy: integer("processed_by").references(() => adminUsers.id, { onDelete: "set null" }),
  notes: text("notes"),
}, (table) => ({
  memberIdx: index("idx_reward_redemptions_member").on(table.memberId),
  statusIdx: index("idx_reward_redemptions_status").on(table.status),
}));

export type Reward = typeof rewards.$inferSelect;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type RewardRedemption = typeof rewardRedemptions.$inferSelect;
```

```typescript
// src/db/schema/statistics.ts
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { families } from "./families";
import { members } from "./members";

export const memberStats = sqliteTable("member_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull().unique().references(() => members.id, { onDelete: "cascade" }),
  totalStars: integer("total_stars").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  totalTasksCompleted: integer("total_tasks_completed").default(0),
  totalTimeslotsCompleted: integer("total_timeslots_completed").default(0),
  level: integer("level").default(1),
  lastCompletionDate: text("last_completion_date"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  memberIdx: index("idx_member_stats_member").on(table.memberId),
}));

export const achievements = sqliteTable("achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id").references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  requirementType: text("requirement_type").notNull(),
  requirementValue: integer("requirement_value").notNull(),
  starReward: integer("star_reward").default(0),
  isGlobal: integer("is_global", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const memberAchievements = sqliteTable("member_achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
  earnedAt: text("earned_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueEarning: uniqueIndex("idx_member_achievement_unique").on(table.memberId, table.achievementId),
  memberIdx: index("idx_member_achievements_member").on(table.memberId),
}));

export type MemberStats = typeof memberStats.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type MemberAchievement = typeof memberAchievements.$inferSelect;
```

```typescript
// src/db/schema/settings.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { families } from "./families";

export const layoutSettings = sqliteTable("layout_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export type LayoutSetting = typeof layoutSettings.$inferSelect;
```

### 2.6 Relations Definition

```typescript
// src/db/relations.ts
import { relations } from "drizzle-orm";
import { families } from "./schema/families";
import { members } from "./schema/members";
import { timeslots, timeslotMembers } from "./schema/timeslots";
import { todos, todoTimeslots } from "./schema/todos";
import { todoCompletions, timeslotCompletions } from "./schema/completions";
import { adminUsers, userFamilies } from "./schema/auth";
import { rewards, pointTransactions, rewardRedemptions } from "./schema/rewards";
import { memberStats, achievements, memberAchievements } from "./schema/statistics";
import { layoutSettings } from "./schema/settings";

// Family relations
export const familiesRelations = relations(families, ({ many }) => ({
  members: many(members),
  timeslots: many(timeslots),
  todos: many(todos),
  rewards: many(rewards),
  userFamilies: many(userFamilies),
  layoutSettings: many(layoutSettings),
}));

// Member relations
export const membersRelations = relations(members, ({ one, many }) => ({
  family: one(families, {
    fields: [members.familyId],
    references: [families.id],
  }),
  timeslotMembers: many(timeslotMembers),
  todoCompletions: many(todoCompletions),
  timeslotCompletions: many(timeslotCompletions),
  stats: one(memberStats, {
    fields: [members.id],
    references: [memberStats.memberId],
  }),
  achievements: many(memberAchievements),
  pointTransactions: many(pointTransactions),
  rewardRedemptions: many(rewardRedemptions),
}));

// Timeslot relations
export const timeslotsRelations = relations(timeslots, ({ one, many }) => ({
  family: one(families, {
    fields: [timeslots.familyId],
    references: [families.id],
  }),
  timeslotMembers: many(timeslotMembers),
  todoTimeslots: many(todoTimeslots),
  completions: many(timeslotCompletions),
}));

export const timeslotMembersRelations = relations(timeslotMembers, ({ one }) => ({
  timeslot: one(timeslots, {
    fields: [timeslotMembers.timeslotId],
    references: [timeslots.id],
  }),
  member: one(members, {
    fields: [timeslotMembers.memberId],
    references: [members.id],
  }),
}));

// Todo relations
export const todosRelations = relations(todos, ({ one, many }) => ({
  family: one(families, {
    fields: [todos.familyId],
    references: [families.id],
  }),
  todoTimeslots: many(todoTimeslots),
  completions: many(todoCompletions),
}));

export const todoTimeslotsRelations = relations(todoTimeslots, ({ one }) => ({
  todo: one(todos, {
    fields: [todoTimeslots.todoId],
    references: [todos.id],
  }),
  timeslot: one(timeslots, {
    fields: [todoTimeslots.timeslotId],
    references: [timeslots.id],
  }),
}));

// Admin user relations
export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  userFamilies: many(userFamilies),
}));

export const userFamiliesRelations = relations(userFamilies, ({ one }) => ({
  user: one(adminUsers, {
    fields: [userFamilies.userId],
    references: [adminUsers.id],
  }),
  family: one(families, {
    fields: [userFamilies.familyId],
    references: [families.id],
  }),
}));
```

### 2.7 Database Connection

```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";
import * as relations from "./relations";

const dbPath = process.env.DB_PATH || "./family-todos.db";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqliteInstance: Database | null = null;

export function getDb() {
  if (!dbInstance) {
    sqliteInstance = new Database(dbPath, { create: true });
    sqliteInstance.run("PRAGMA foreign_keys = ON");
    sqliteInstance.run("PRAGMA journal_mode = WAL");

    dbInstance = drizzle(sqliteInstance, {
      schema: { ...schema, ...relations },
    });
  }
  return dbInstance;
}

export function closeDb() {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    dbInstance = null;
  }
}

export { schema };
export type Database = ReturnType<typeof getDb>;
```

### 2.8 Query Migration Examples

**Before (Raw SQL):**
```typescript
// src/server/members.ts (current)
export const getMembers = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const members = db.query<Member, []>(
    "SELECT * FROM members ORDER BY created_at ASC"
  ).all();
  return members;
});
```

**After (Drizzle):**
```typescript
// src/server/members.ts (with Drizzle + multi-tenancy)
import { eq, asc } from "drizzle-orm";
import { getDb, schema } from "../db";
import { getFamilyIdFromSession } from "../utils/session";

export const getMembers = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const familyId = await getFamilyIdFromSession();

  const result = await db
    .select()
    .from(schema.members)
    .where(eq(schema.members.familyId, familyId))
    .orderBy(asc(schema.members.createdAt));

  return result;
});
```

**Complex Query Example (Completions with JOIN):**
```typescript
// Before
const completions = db.query<TodoCompletion, [string, number]>(
  `SELECT tc.*, t.title as todo_title
   FROM todo_completions tc
   JOIN todos t ON tc.todo_id = t.id
   WHERE tc.completion_date = ? AND tc.member_id = ?`
).all(date, memberId);

// After
const completions = await db
  .select({
    ...schema.todoCompletions,
    todoTitle: schema.todos.title,
  })
  .from(schema.todoCompletions)
  .innerJoin(schema.todos, eq(schema.todoCompletions.todoId, schema.todos.id))
  .where(
    and(
      eq(schema.todoCompletions.completionDate, date),
      eq(schema.todoCompletions.memberId, memberId),
      eq(schema.todos.familyId, familyId) // Multi-tenant filter
    )
  );
```

---

## 3. Multi-Tenancy Architecture

### 3.1 Tenant Isolation Strategy

**Approach:** Row-Level Security via `family_id` column

```
+------------------+
|    families      |  <-- Tenant table
+------------------+
         |
         | family_id (FK)
         v
+------------------+     +------------------+     +------------------+
|    members       |     |   timeslots      |     |     todos        |
+------------------+     +------------------+     +------------------+
         |                        |                       |
         v                        v                       v
+------------------+     +------------------+     +------------------+
| member_stats     |     | todo_completions |     | point_transactions|
+------------------+     +------------------+     +------------------+
```

### 3.2 Session Structure

```typescript
// src/utils/session.ts
type SessionData = {
  userId?: number;
  username?: string;
  isAuthenticated?: boolean;

  // Multi-tenancy fields
  currentFamilyId?: number;
  familyIds?: number[];           // All families user belongs to
  currentFamilyRole?: "owner" | "admin" | "member";
};
```

### 3.3 Tenant Context Helper

```typescript
// src/utils/tenant.ts
import { useAppSession } from "./session";

export async function getTenantContext() {
  const session = await useAppSession();

  if (!session.data.isAuthenticated) {
    throw new Error("Not authenticated");
  }

  if (!session.data.currentFamilyId) {
    throw new Error("No family selected");
  }

  return {
    userId: session.data.userId!,
    familyId: session.data.currentFamilyId,
    role: session.data.currentFamilyRole!,
  };
}

export async function requireRole(allowedRoles: Array<"owner" | "admin" | "member">) {
  const ctx = await getTenantContext();

  if (!allowedRoles.includes(ctx.role)) {
    throw new Error(`Requires one of roles: ${allowedRoles.join(", ")}`);
  }

  return ctx;
}
```

### 3.4 Server Function Pattern

```typescript
// Pattern for all tenant-scoped server functions
export const getTodos = createServerFn({ method: "GET" })
  .handler(async () => {
    const { familyId } = await getTenantContext();
    const db = getDb();

    return db
      .select()
      .from(schema.todos)
      .where(eq(schema.todos.familyId, familyId))
      .orderBy(asc(schema.todos.position));
  });

// Pattern for mutations requiring specific role
export const deleteTodo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const { familyId } = await requireRole(["owner", "admin"]);
    const db = getDb();

    // Verify todo belongs to family before deleting
    const todo = await db
      .select()
      .from(schema.todos)
      .where(
        and(
          eq(schema.todos.id, data.id),
          eq(schema.todos.familyId, familyId)
        )
      )
      .limit(1);

    if (!todo.length) {
      throw new Error("Todo not found");
    }

    await db
      .delete(schema.todos)
      .where(eq(schema.todos.id, data.id));

    return { success: true };
  });
```

### 3.5 SSE Channel Isolation

```typescript
// src/server/realtime.ts
type SSEConnection = {
  controller: ReadableStreamDefaultController;
  familyId: number;
  clientId: string;
};

// Store connections by family
const connectionsByFamily = new Map<number, Map<string, SSEConnection>>();

export function addConnection(familyId: number, clientId: string, controller: ReadableStreamDefaultController) {
  if (!connectionsByFamily.has(familyId)) {
    connectionsByFamily.set(familyId, new Map());
  }
  connectionsByFamily.get(familyId)!.set(clientId, { controller, familyId, clientId });
}

export function broadcastToFamily(familyId: number, event: RealtimeEvent) {
  const familyConnections = connectionsByFamily.get(familyId);
  if (!familyConnections) return;

  const message = `data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`;
  const encoded = new TextEncoder().encode(message);

  const failed: string[] = [];
  familyConnections.forEach((conn, clientId) => {
    try {
      conn.controller.enqueue(encoded);
    } catch {
      failed.push(clientId);
    }
  });

  failed.forEach(id => familyConnections.delete(id));
}
```

---

## 4. Onboarding Flow

### 4.1 User Journey

```
1. Landing Page
   |
   v
2. Sign Up (create account)
   |
   v
3. Create Family (name, optional slug)
   |
   v
4. Add Family Members (wizard step 1)
   |
   v
5. Create Timeslots (wizard step 2, with templates)
   |
   v
6. Add Todos (wizard step 3, with templates)
   |
   v
7. Review & Complete
   |
   v
8. Dashboard (fully onboarded)
```

### 4.2 Route Structure

```
src/routes/
  signup.tsx           # Account creation
  onboarding/
    _layout.tsx        # Onboarding layout with progress
    index.tsx          # Redirect to first incomplete step
    family.tsx         # Step 1: Create family
    members.tsx        # Step 2: Add members
    timeslots.tsx      # Step 3: Create schedules
    todos.tsx          # Step 4: Add tasks
    complete.tsx       # Step 5: Review & finish
```

### 4.3 Onboarding State Machine

```typescript
// src/types/onboarding.ts
export type OnboardingStep =
  | "family"
  | "members"
  | "timeslots"
  | "todos"
  | "complete";

export type OnboardingState = {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  familyId?: number;
  membersAdded: number;
  timeslotsCreated: number;
  todosCreated: number;
};

// Minimum requirements to proceed
export const STEP_REQUIREMENTS = {
  family: { required: true },
  members: { minCount: 1 },
  timeslots: { minCount: 0 }, // Optional, can use templates
  todos: { minCount: 0 },     // Optional, can use templates
  complete: { required: true },
};
```

### 4.4 Onboarding Server Functions

```typescript
// src/server/onboarding.ts
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getDb, schema } from "../db";
import { eq, and } from "drizzle-orm";
import { useAppSession } from "../utils/session";
import { hashPassword } from "../utils/password";

// Step 0: Create account
export const signUp = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8)
      .regex(/[A-Z]/, "Must contain uppercase")
      .regex(/[a-z]/, "Must contain lowercase")
      .regex(/[0-9]/, "Must contain number"),
  }))
  .handler(async ({ data }) => {
    const db = getDb();

    // Check if username/email exists
    const existing = await db
      .select()
      .from(schema.adminUsers)
      .where(
        or(
          eq(schema.adminUsers.username, data.username),
          eq(schema.adminUsers.email, data.email)
        )
      )
      .limit(1);

    if (existing.length) {
      throw new Error("Username or email already exists");
    }

    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(schema.adminUsers)
      .values({
        username: data.username,
        email: data.email,
        passwordHash,
      })
      .returning();

    // Set session
    const session = await useAppSession();
    await session.update({
      userId: user.id,
      username: user.username,
      isAuthenticated: true,
      familyIds: [],
      currentFamilyId: undefined,
    });

    return { success: true, userId: user.id };
  });

// Step 1: Create family
export const createFamily = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional(),
  }))
  .handler(async ({ data }) => {
    const session = await useAppSession();
    if (!session.data.userId) throw new Error("Not authenticated");

    const db = getDb();

    // Generate slug if not provided
    const slug = data.slug || data.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Create family
    const [family] = await db
      .insert(schema.families)
      .values({
        name: data.name,
        slug,
        isOnboarded: false,
      })
      .returning();

    // Link user to family as owner
    await db
      .insert(schema.userFamilies)
      .values({
        userId: session.data.userId,
        familyId: family.id,
        role: "owner",
      });

    // Update session
    await session.update({
      ...session.data,
      currentFamilyId: family.id,
      familyIds: [...(session.data.familyIds || []), family.id],
      currentFamilyRole: "owner",
    });

    // Seed default global achievements for this family
    await seedDefaultAchievements(db, family.id);

    return family;
  });

// Step 2: Add members (can be called multiple times)
export const addMemberOnboarding = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    name: z.string().min(1),
    isParent: z.boolean().default(false),
    avatar: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { familyId } = await getTenantContext();
    const db = getDb();

    const [member] = await db
      .insert(schema.members)
      .values({
        familyId,
        name: data.name,
        isParent: data.isParent,
        avatar: data.avatar,
      })
      .returning();

    // Initialize member stats
    await db
      .insert(schema.memberStats)
      .values({ memberId: member.id });

    return member;
  });

// Apply template (timeslots + todos)
export const applyTemplate = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    templateId: z.enum(["morning-routine", "homework", "bedtime", "chores", "blank"]),
    memberIds: z.array(z.number()).min(1),
  }))
  .handler(async ({ data }) => {
    const { familyId } = await getTenantContext();
    const db = getDb();

    const template = TEMPLATES[data.templateId];
    if (!template) throw new Error("Template not found");

    // Create timeslot
    const [timeslot] = await db
      .insert(schema.timeslots)
      .values({
        familyId,
        name: template.name,
        description: template.description,
        startTime: template.startTime,
        endTime: template.endTime,
        recurrenceType: template.recurrenceType,
        recurrenceDays: template.recurrenceDays,
      })
      .returning();

    // Assign members
    for (const memberId of data.memberIds) {
      await db
        .insert(schema.timeslotMembers)
        .values({ timeslotId: timeslot.id, memberId });
    }

    // Create todos
    for (let i = 0; i < template.todos.length; i++) {
      const todoData = template.todos[i];
      const [todo] = await db
        .insert(schema.todos)
        .values({
          familyId,
          title: todoData.title,
          symbol: todoData.symbol,
          points: todoData.points || 5,
          position: i,
        })
        .returning();

      await db
        .insert(schema.todoTimeslots)
        .values({ todoId: todo.id, timeslotId: timeslot.id });
    }

    return { timeslot, todoCount: template.todos.length };
  });

// Complete onboarding
export const completeOnboarding = createServerFn({ method: "POST" })
  .handler(async () => {
    const { familyId } = await getTenantContext();
    const db = getDb();

    // Verify minimum requirements
    const memberCount = await db
      .select({ count: sql`count(*)` })
      .from(schema.members)
      .where(eq(schema.members.familyId, familyId));

    if (memberCount[0].count < 1) {
      throw new Error("At least one family member is required");
    }

    // Mark family as onboarded
    await db
      .update(schema.families)
      .set({ isOnboarded: true, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(schema.families.id, familyId));

    return { success: true };
  });

// Get onboarding status
export const getOnboardingStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await useAppSession();

    if (!session.data.userId) {
      return { step: "signup" as const, isAuthenticated: false };
    }

    if (!session.data.currentFamilyId) {
      return { step: "family" as const, isAuthenticated: true, hasFamily: false };
    }

    const db = getDb();
    const familyId = session.data.currentFamilyId;

    const [family] = await db
      .select()
      .from(schema.families)
      .where(eq(schema.families.id, familyId));

    if (family?.isOnboarded) {
      return { step: "complete" as const, isAuthenticated: true, isOnboarded: true };
    }

    // Check progress
    const [memberCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.members)
      .where(eq(schema.members.familyId, familyId));

    const [timeslotCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.timeslots)
      .where(eq(schema.timeslots.familyId, familyId));

    const [todoCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.todos)
      .where(eq(schema.todos.familyId, familyId));

    return {
      isAuthenticated: true,
      isOnboarded: false,
      familyId,
      familyName: family.name,
      progress: {
        members: memberCount.count,
        timeslots: timeslotCount.count,
        todos: todoCount.count,
      },
      step: memberCount.count === 0 ? "members" as const
          : timeslotCount.count === 0 ? "timeslots" as const
          : todoCount.count === 0 ? "todos" as const
          : "review" as const,
    };
  });
```

### 4.5 Template Definitions

```typescript
// src/config/templates.ts
export const TEMPLATES = {
  "morning-routine": {
    name: "Morning Routine",
    description: "Start the day right",
    startTime: "07:00",
    endTime: "08:30",
    recurrenceType: "daily" as const,
    recurrenceDays: "1,2,3,4,5", // Weekdays
    todos: [
      { title: "Wake Up", symbol: "sun", points: 5 },
      { title: "Brush Teeth", symbol: "tooth", points: 5 },
      { title: "Get Dressed", symbol: "shirt", points: 5 },
      { title: "Eat Breakfast", symbol: "bowl", points: 5 },
      { title: "Pack Bag", symbol: "backpack", points: 5 },
    ],
  },
  "homework": {
    name: "Homework Time",
    description: "After school study session",
    startTime: "16:00",
    endTime: "17:30",
    recurrenceType: "weekly" as const,
    recurrenceDays: "1,2,3,4", // Mon-Thu
    todos: [
      { title: "Reading", symbol: "book", points: 10 },
      { title: "Math Practice", symbol: "calculator", points: 10 },
      { title: "Writing", symbol: "pencil", points: 10 },
    ],
  },
  "bedtime": {
    name: "Bedtime Routine",
    description: "Wind down for sleep",
    startTime: "19:30",
    endTime: "20:30",
    recurrenceType: "daily" as const,
    recurrenceDays: "0,1,2,3,4,5,6",
    todos: [
      { title: "Bath Time", symbol: "bathtub", points: 5 },
      { title: "Brush Teeth", symbol: "tooth", points: 5 },
      { title: "Put on Pajamas", symbol: "moon", points: 5 },
      { title: "Story Time", symbol: "book", points: 5 },
    ],
  },
  "chores": {
    name: "Weekly Chores",
    description: "Help around the house",
    startTime: "10:00",
    endTime: "12:00",
    recurrenceType: "weekly" as const,
    recurrenceDays: "6", // Saturday
    todos: [
      { title: "Make Bed", symbol: "bed", points: 5 },
      { title: "Clean Room", symbol: "broom", points: 10 },
      { title: "Put Away Toys", symbol: "toy", points: 5 },
      { title: "Help with Laundry", symbol: "shirt", points: 10 },
    ],
  },
  "blank": {
    name: "Custom Routine",
    description: "Create your own",
    startTime: "09:00",
    endTime: "10:00",
    recurrenceType: "daily" as const,
    recurrenceDays: "1,2,3,4,5",
    todos: [],
  },
};
```

### 4.6 Onboarding UI Components

```typescript
// src/routes/onboarding/_layout.tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getOnboardingStatus } from "../../server/onboarding";

export const Route = createFileRoute("/onboarding/_layout")({
  beforeLoad: async () => {
    const status = await getOnboardingStatus();

    if (!status.isAuthenticated) {
      throw redirect({ to: "/signup" });
    }

    if (status.isOnboarded) {
      throw redirect({ to: "/" });
    }

    return status;
  },
  component: OnboardingLayout,
});

function OnboardingLayout() {
  const status = Route.useLoaderData();

  const steps = [
    { id: "family", label: "Create Family" },
    { id: "members", label: "Add Members" },
    { id: "timeslots", label: "Set Schedules" },
    { id: "todos", label: "Add Tasks" },
    { id: "review", label: "Review" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <nav className="mb-8">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => (
              <li key={step.id} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${status.step === step.id
                    ? "bg-blue-600 text-white"
                    : index < steps.findIndex(s => s.id === status.step)
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }
                `}>
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-12 h-0.5 bg-gray-200 mx-2" />
                )}
              </li>
            ))}
          </ol>
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
```

---

## 5. Implementation Phases

### Phase 1: Drizzle ORM Migration (Week 1-2)

**Tasks:**
1. Install Drizzle dependencies
2. Create schema files in `src/db/schema/`
3. Set up Drizzle config and migrations
4. Create database connection module
5. Migrate server functions one by one:
   - `members.ts`
   - `timeslots.ts`
   - `todos.ts`
   - `completions.ts`
   - `statistics.ts`
   - `rewards.ts`
   - `auth.ts`
   - `admin-users.ts`
   - `layoutSettings.ts`
6. Update types to use Drizzle inferred types
7. Test all existing functionality

**Files to Create:**
- `drizzle.config.ts`
- `src/db/index.ts`
- `src/db/schema/*.ts` (8 files)
- `src/db/relations.ts`

**Files to Modify:**
- All `src/server/*.ts` files
- `src/db/types.ts` (remove, use Drizzle types)

### Phase 2: Multi-Tenancy Foundation (Week 2-3)

**Tasks:**
1. Create `families` table migration
2. Add `family_id` columns to all tables
3. Create `user_families` junction table
4. Update session structure
5. Create tenant context utilities
6. Update all server functions with family filtering
7. Update SSE to broadcast by family
8. Migrate existing data to default family

**Files to Create:**
- `src/utils/tenant.ts`
- `src/db/migrations/0001_add_families.sql`

**Files to Modify:**
- `src/utils/session.ts`
- All `src/server/*.ts` files
- `src/server/realtime.ts`
- `src/routes/api/sse.ts`

### Phase 3: Authentication Overhaul (Week 3)

**Tasks:**
1. Add email field to admin_users
2. Create signup server function
3. Create signup route
4. Update login to support family selection
5. Add family switching UI
6. Update session management

**Files to Create:**
- `src/routes/signup.tsx`
- `src/server/signup.ts`
- `src/components/FamilySelector.tsx`

**Files to Modify:**
- `src/server/auth.ts`
- `src/routes/login.tsx`
- `src/utils/session.ts`

### Phase 4: Onboarding Flow (Week 4)

**Tasks:**
1. Create onboarding route structure
2. Build onboarding layout with progress
3. Implement family creation step
4. Implement member addition step
5. Implement timeslot creation with templates
6. Implement todo creation with templates
7. Build review/completion step
8. Add onboarding status checks to routes

**Files to Create:**
- `src/routes/onboarding/_layout.tsx`
- `src/routes/onboarding/index.tsx`
- `src/routes/onboarding/family.tsx`
- `src/routes/onboarding/members.tsx`
- `src/routes/onboarding/timeslots.tsx`
- `src/routes/onboarding/todos.tsx`
- `src/routes/onboarding/complete.tsx`
- `src/server/onboarding.ts`
- `src/config/templates.ts`
- `src/components/onboarding/*.tsx`

### Phase 5: Remove Hardcoded Seeds (Week 4)

**Tasks:**
1. Remove `seedInitialData()` from production
2. Keep for test database only
3. Update database initialization
4. Add migration for existing users

**Files to Modify:**
- `src/db/schema.ts` (legacy, then remove)
- `src/db/index.ts`

### Phase 6: Testing and Polish (Week 5)

**Tasks:**
1. Update all Playwright tests
2. Add multi-tenant test scenarios
3. Test onboarding flow end-to-end
4. Test family switching
5. Performance testing with multiple families
6. Security audit for tenant isolation

---

## 6. Database Schema Changes

### 6.1 Migration: Add Families Table

```sql
-- 0001_add_families.sql
CREATE TABLE families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  subscription_tier TEXT DEFAULT 'free',
  is_onboarded INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create default family for existing data
INSERT INTO families (name, slug, is_onboarded) VALUES ('Default Family', 'default', 1);

-- Add family_id to all tables
ALTER TABLE members ADD COLUMN family_id INTEGER REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE timeslots ADD COLUMN family_id INTEGER REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE todos ADD COLUMN family_id INTEGER REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE rewards ADD COLUMN family_id INTEGER REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE layout_settings ADD COLUMN family_id INTEGER REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE achievements ADD COLUMN family_id INTEGER REFERENCES families(id) ON DELETE CASCADE;

-- Set existing data to default family
UPDATE members SET family_id = 1;
UPDATE timeslots SET family_id = 1;
UPDATE todos SET family_id = 1;
UPDATE rewards SET family_id = 1;
UPDATE layout_settings SET family_id = 1;
UPDATE achievements SET family_id = 1;

-- Add NOT NULL constraint (SQLite workaround)
-- Would need to recreate tables for proper NOT NULL
```

### 6.2 Migration: User-Family Junction

```sql
-- 0002_user_families.sql
ALTER TABLE admin_users ADD COLUMN email TEXT UNIQUE;

CREATE TABLE user_families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, family_id)
);

CREATE INDEX idx_user_families_user ON user_families(user_id);
CREATE INDEX idx_user_families_family ON user_families(family_id);

-- Link existing admin to default family
INSERT INTO user_families (user_id, family_id, role)
SELECT id, 1, 'owner' FROM admin_users;
```

### 6.3 New Indexes for Multi-Tenancy

```sql
-- 0003_add_family_indexes.sql
CREATE INDEX idx_members_family ON members(family_id);
CREATE INDEX idx_timeslots_family ON timeslots(family_id);
CREATE INDEX idx_todos_family ON todos(family_id);
CREATE INDEX idx_rewards_family ON rewards(family_id);
CREATE INDEX idx_achievements_family ON achievements(family_id);

-- Composite indexes for common queries
CREATE INDEX idx_members_family_parent ON members(family_id, is_parent);
CREATE INDEX idx_timeslots_family_active ON timeslots(family_id, is_active);
CREATE INDEX idx_todos_family_position ON todos(family_id, position);
```

---

## 7. API Changes

### 7.1 New Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/signup` | POST | Create new account |
| `/api/families` | GET | List user's families |
| `/api/families` | POST | Create new family |
| `/api/families/switch` | POST | Switch active family |
| `/api/onboarding/status` | GET | Get onboarding progress |
| `/api/onboarding/complete` | POST | Mark onboarding done |
| `/api/templates` | GET | List available templates |
| `/api/templates/apply` | POST | Apply template to family |

### 7.2 Modified Endpoints

All existing endpoints gain implicit `family_id` filtering from session:

```typescript
// Before: Returns ALL members
GET /api/members

// After: Returns members for current family only
GET /api/members
// Internally: WHERE family_id = session.currentFamilyId
```

### 7.3 Query Key Updates

```typescript
// Before
queryKey: ["members"]

// After (family-scoped)
queryKey: ["members", familyId]

// This ensures cache invalidation when switching families
```

---

## 8. Security Considerations

### 8.1 Tenant Isolation Checklist

- [ ] All SELECT queries filter by `family_id`
- [ ] All UPDATE queries verify `family_id` ownership
- [ ] All DELETE queries verify `family_id` ownership
- [ ] SSE only broadcasts to same-family connections
- [ ] File uploads are namespaced by family
- [ ] Session contains only families user belongs to
- [ ] Rate limiting per family (prevent abuse)

### 8.2 Authentication Security

- [ ] Password requirements enforced (8+ chars, mixed case, numbers)
- [ ] Email verification for new accounts
- [ ] Rate limiting on login attempts
- [ ] Session expiration (7 days current)
- [ ] CSRF protection via SameSite cookies
- [ ] No sensitive data in JWT/session visible to client

### 8.3 Data Access Patterns

```typescript
// ALWAYS verify ownership before mutation
async function verifyOwnership(entityId: number, table: Table, familyId: number) {
  const entity = await db
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(table.id, entityId),
        eq(table.familyId, familyId)
      )
    )
    .limit(1);

  if (!entity.length) {
    throw new Error("Not found or access denied");
  }
}
```

### 8.4 Audit Logging (Future)

```typescript
// src/db/schema/audit.ts
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id").references(() => families.id),
  userId: integer("user_id").references(() => adminUsers.id),
  action: text("action").notNull(), // create, update, delete
  entityType: text("entity_type").notNull(), // member, todo, etc.
  entityId: integer("entity_id"),
  oldValue: text("old_value"), // JSON
  newValue: text("new_value"), // JSON
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
```

---

## Summary

This design plan outlines a comprehensive transformation from a single-family application to a multi-tenant SaaS platform. Key changes include:

1. **Drizzle ORM** - Type-safe database layer with proper migrations
2. **Multi-tenancy** - Row-level isolation via `family_id`
3. **Dynamic onboarding** - Wizard-based setup replacing hardcoded seeds
4. **Enhanced auth** - User registration, family creation, role-based access

The implementation is divided into 6 phases over approximately 5 weeks, with careful attention to maintaining backward compatibility during migration.
