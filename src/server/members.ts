import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, asc, and } from "drizzle-orm";
import { db, schema } from "../db";
import { getTenantContext, requireRole } from "../utils/tenant";

export const getMembers = createServerFn({ method: "GET" }).handler(
  async () => {
    const { familyId } = await getTenantContext();

    const members = await db
      .select()
      .from(schema.members)
      .where(eq(schema.members.familyId, familyId))
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
    const { familyId } = await requireRole(["owner", "admin"]);

    const [member] = await db
      .insert(schema.members)
      .values({
        familyId,
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
    const { familyId } = await requireRole(["owner", "admin"]);

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
          eq(schema.members.familyId, familyId)
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
    const { familyId } = await requireRole(["owner", "admin"]);

    await db
      .delete(schema.members)
      .where(
        and(
          eq(schema.members.id, data.id),
          eq(schema.members.familyId, familyId)
        )
      );

    return { success: true };
  });

// Re-export Member type for backwards compatibility
export type { Member } from "../db/schema";
