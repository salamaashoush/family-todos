import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { useAppSession } from "~/utils/session";
import { getTenantContext } from "../utils/tenant";
import { TEMPLATES, type TemplateId } from "../config/templates";
import type { RecurrenceType } from "../db/schema";
import { generateShareToken } from "./crypto";

// Get onboarding status
export const getOnboardingStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();

    // Not authenticated
    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      return {
        step: "signup" as const,
        isAuthenticated: false,
        isOnboarded: false,
      };
    }

    // Authenticated but no family
    if (!session.data.currentFamilyId) {
      return {
        step: "family" as const,
        isAuthenticated: true,
        hasFamily: false,
        isOnboarded: false,
      };
    }

    const familyId = session.data.currentFamilyId;

    // Get family details
    const [family] = await db
      .select()
      .from(schema.families)
      .where(eq(schema.families.id, familyId))
      .limit(1);

    if (!family) {
      return {
        step: "family" as const,
        isAuthenticated: true,
        hasFamily: false,
        isOnboarded: false,
      };
    }

    // Already onboarded
    if (family.isOnboarded) {
      return {
        step: "complete" as const,
        isAuthenticated: true,
        isOnboarded: true,
        familyId,
        familyName: family.name,
      };
    }

    // Check progress
    const [memberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.members)
      .where(eq(schema.members.familyId, familyId));

    const [timeslotCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.timeslots)
      .where(eq(schema.timeslots.familyId, familyId));

    const [todoCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.todos)
      .where(eq(schema.todos.familyId, familyId));

    const progress = {
      members: memberCount?.count || 0,
      timeslots: timeslotCount?.count || 0,
      todos: todoCount?.count || 0,
    };

    // Determine current step based on progress
    let step: "members" | "timeslots" | "todos" | "review";
    if (progress.members === 0) {
      step = "members";
    } else if (progress.timeslots === 0) {
      step = "timeslots";
    } else if (progress.todos === 0) {
      step = "todos";
    } else {
      step = "review";
    }

    return {
      step,
      isAuthenticated: true,
      isOnboarded: false,
      familyId,
      familyName: family.name,
      progress,
    };
  }
);

// Generate a short random identifier (6 chars)
function generateShortId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create family (step 1)
const CreateFamilySchema = z.object({
  name: z.string().min(1, "Family name is required").max(100),
});

export const createFamily = createServerFn({ method: "POST" })
  .inputValidator(CreateFamilySchema)
  .handler(async ({ data }) => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
    }

    // Get the admin user to use their username for the member
    const [adminUser] = await db
      .select({ username: schema.adminUsers.username })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, session.data.adminUserId))
      .limit(1);

    // Generate slug from name with a short random suffix to ensure uniqueness
    const baseSlug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 40); // Limit base slug length

    const slug = `${baseSlug}-${generateShortId()}`;

    // Create family with share token for public board access
    const [family] = await db
      .insert(schema.families)
      .values({
        name: data.name,
        slug,
        shareToken: generateShareToken(),
        isOnboarded: false,
      })
      .returning();

    // Link user to family as owner
    await db.insert(schema.userFamilies).values({
      userId: session.data.adminUserId,
      familyId: family.id,
      role: "owner",
    });

    // Create the admin user as a parent family member automatically
    const [ownerMember] = await db
      .insert(schema.members)
      .values({
        familyId: family.id,
        name: adminUser?.username || "Parent",
        isParent: true,
      })
      .returning();

    // Initialize member stats for the owner
    await db.insert(schema.memberStats).values({
      memberId: ownerMember.id,
    });

    // Update session
    await session.update({
      ...session.data,
      currentFamilyId: family.id,
      familyIds: [...(session.data.familyIds || []), family.id],
      currentFamilyRole: "owner",
    });

    // Seed default global achievements for this family
    await seedDefaultAchievements(family.id);

    return family;
  });

// Add member during onboarding
const AddMemberOnboardingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  avatar: z.string().optional(),
  isParent: z.boolean().default(false),
});

export const addMemberOnboarding = createServerFn({ method: "POST" })
  .inputValidator(AddMemberOnboardingSchema)
  .handler(async ({ data }) => {
    const { familyId } = await getTenantContext();

    const [member] = await db
      .insert(schema.members)
      .values({
        familyId,
        name: data.name,
        avatar: data.avatar || null,
        isParent: data.isParent,
      })
      .returning();

    // Initialize member stats
    await db.insert(schema.memberStats).values({
      memberId: member.id,
    });

    return member;
  });

// Get available templates
export const getTemplates = createServerFn({ method: "GET" }).handler(async () => {
  return Object.entries(TEMPLATES).map(([id, template]) => ({
    id,
    name: template.name,
    description: template.description,
    todoCount: template.todos.length,
  }));
});

// Apply template
const ApplyTemplateSchema = z.object({
  templateId: z.string(),
  memberIds: z.array(z.number()).min(1, "At least one member must be selected"),
});

export const applyTemplate = createServerFn({ method: "POST" })
  .inputValidator(ApplyTemplateSchema)
  .handler(async ({ data }) => {
    const { familyId } = await getTenantContext();

    const template = TEMPLATES[data.templateId as TemplateId];
    if (!template) {
      throw new Error("Template not found");
    }

    // Create timeslot
    const [timeslot] = await db
      .insert(schema.timeslots)
      .values({
        familyId,
        name: template.name,
        description: template.description,
        startTime: template.startTime,
        endTime: template.endTime,
        recurrenceType: template.recurrenceType as RecurrenceType,
        recurrenceDays: template.recurrenceDays,
      })
      .returning();

    // Assign members to timeslot
    for (const memberId of data.memberIds) {
      await db.insert(schema.timeslotMembers).values({
        timeslotId: timeslot.id,
        memberId,
      });
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

      // Link todo to timeslot
      await db.insert(schema.todoTimeslots).values({
        todoId: todo.id,
        timeslotId: timeslot.id,
      });
    }

    return {
      timeslot,
      todoCount: template.todos.length,
    };
  });

// Create custom timeslot during onboarding
const CreateTimeslotOnboardingSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  recurrenceType: z.enum(["daily", "weekly", "monthly", "none"]).default("daily"),
  recurrenceDays: z.string().optional(),
  memberIds: z.array(z.number()).min(1),
});

export const createTimeslotOnboarding = createServerFn({ method: "POST" })
  .inputValidator(CreateTimeslotOnboardingSchema)
  .handler(async ({ data }) => {
    const { familyId } = await getTenantContext();

    const [timeslot] = await db
      .insert(schema.timeslots)
      .values({
        familyId,
        name: data.name,
        description: data.description || null,
        startTime: data.startTime,
        endTime: data.endTime,
        recurrenceType: data.recurrenceType as RecurrenceType,
        recurrenceDays: data.recurrenceDays || null,
      })
      .returning();

    // Assign members
    for (const memberId of data.memberIds) {
      await db.insert(schema.timeslotMembers).values({
        timeslotId: timeslot.id,
        memberId,
      });
    }

    return {
      ...timeslot,
      memberIds: data.memberIds,
    };
  });

// Create todo during onboarding
const CreateTodoOnboardingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  symbol: z.string().optional(),
  points: z.number().min(0).default(5),
  timeslotIds: z.array(z.number()).min(1),
});

export const createTodoOnboarding = createServerFn({ method: "POST" })
  .inputValidator(CreateTodoOnboardingSchema)
  .handler(async ({ data }) => {
    const { familyId } = await getTenantContext();

    // Get max position
    const [maxPos] = await db
      .select({ maxPosition: sql<number>`COALESCE(MAX(${schema.todos.position}), -1)` })
      .from(schema.todos)
      .where(eq(schema.todos.familyId, familyId));

    const [todo] = await db
      .insert(schema.todos)
      .values({
        familyId,
        title: data.title,
        description: data.description || null,
        symbol: data.symbol || null,
        points: data.points,
        position: (maxPos?.maxPosition || 0) + 1,
      })
      .returning();

    // Link to timeslots
    for (const timeslotId of data.timeslotIds) {
      await db.insert(schema.todoTimeslots).values({
        todoId: todo.id,
        timeslotId,
      });
    }

    return {
      ...todo,
      timeslotIds: data.timeslotIds,
    };
  });

// Complete onboarding
export const completeOnboarding = createServerFn({ method: "POST" }).handler(
  async () => {
    const { familyId } = await getTenantContext();

    // Verify minimum requirements
    const [memberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.members)
      .where(eq(schema.members.familyId, familyId));

    if ((memberCount?.count || 0) < 1) {
      throw new Error("At least one family member is required");
    }

    // Mark family as onboarded
    await db
      .update(schema.families)
      .set({
        isOnboarded: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.families.id, familyId));

    return { success: true };
  }
);

// Helper function to seed default achievements
async function seedDefaultAchievements(familyId: number) {
  const defaultAchievements = [
    {
      name: "First Steps",
      description: "Complete your first task",
      icon: "footprints",
      requirementType: "tasks_completed",
      requirementValue: 1,
      starReward: 5,
    },
    {
      name: "Getting Started",
      description: "Complete 10 tasks",
      icon: "rocket",
      requirementType: "tasks_completed",
      requirementValue: 10,
      starReward: 10,
    },
    {
      name: "Task Master",
      description: "Complete 50 tasks",
      icon: "trophy",
      requirementType: "tasks_completed",
      requirementValue: 50,
      starReward: 25,
    },
    {
      name: "Streak Starter",
      description: "Complete tasks 3 days in a row",
      icon: "flame",
      requirementType: "streak",
      requirementValue: 3,
      starReward: 10,
    },
    {
      name: "Week Warrior",
      description: "Complete tasks 7 days in a row",
      icon: "calendar",
      requirementType: "streak",
      requirementValue: 7,
      starReward: 25,
    },
    {
      name: "Star Collector",
      description: "Earn 100 stars",
      icon: "star",
      requirementType: "stars",
      requirementValue: 100,
      starReward: 20,
    },
  ];

  for (const achievement of defaultAchievements) {
    await db.insert(schema.achievements).values({
      familyId,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      requirementType: achievement.requirementType,
      requirementValue: achievement.requirementValue,
      starReward: achievement.starReward,
      isGlobal: false,
    });
  }
}
