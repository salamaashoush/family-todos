import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, asc, and } from "drizzle-orm";
import { db, schema } from "../db";

// For now, we'll use a default family ID of 1
// This will be replaced with session-based family ID in multi-tenancy phase
const DEFAULT_FAMILY_ID = 1;

export const getMembers = createServerFn({ method: "GET" }).handler(
  async () => {
    const members = await db
      .select()
      .from(schema.members)
      .where(eq(schema.members.familyId, DEFAULT_FAMILY_ID))
      .orderBy(asc(schema.members.createdAt));

    return members;
  }
);

const CreateMemberSchema = z.object({
  name: z.string().min(1),
  avatar: z.string().optional(),
  isParent: z.boolean().optional(),
});

export const createMember = createServerFn({ method: "POST" })
  .inputValidator(CreateMemberSchema)
  .handler(async ({ data }) => {
    const [member] = await db
      .insert(schema.members)
      .values({
        familyId: DEFAULT_FAMILY_ID,
        name: data.name,
        avatar: data.avatar || null,
        isParent: data.isParent ?? false,
      })
      .returning();

    // Initialize member stats
    await db.insert(schema.memberStats).values({
      memberId: member.id,
    });

    return member;
  });

const UpdateMemberSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
  isParent: z.boolean().optional(),
});

export const updateMember = createServerFn({ method: "POST" })
  .inputValidator(UpdateMemberSchema)
  .handler(async ({ data }) => {
    const updateData: Partial<{
      name: string;
      avatar: string | null;
      isParent: boolean;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar;
    }
    if (data.isParent !== undefined) {
      updateData.isParent = data.isParent;
    }

    const [member] = await db
      .update(schema.members)
      .set(updateData)
      .where(
        and(
          eq(schema.members.id, data.id),
          eq(schema.members.familyId, DEFAULT_FAMILY_ID)
        )
      )
      .returning();

    return member;
  });

const DeleteMemberSchema = z.object({
  id: z.number(),
});

export const deleteMember = createServerFn({ method: "POST" })
  .inputValidator(DeleteMemberSchema)
  .handler(async ({ data }) => {
    await db
      .delete(schema.members)
      .where(
        and(
          eq(schema.members.id, data.id),
          eq(schema.members.familyId, DEFAULT_FAMILY_ID)
        )
      );

    return { success: true };
  });

// Re-export Member type for backwards compatibility
export type { Member } from "../db/schema";
