import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, asc, and } from "drizzle-orm";
import { db, schema } from "../db";
import { getTenantContext, requireRole } from "../utils/tenant";
import { logCreate, logUpdate, logDelete, sanitizeForAudit } from "../utils/audit";

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
    const { familyId, userId } = await requireRole(["owner", "admin"]);

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

    // Audit log
    logCreate({
      familyId,
      userId,
      entityType: "member",
      entityId: member.id,
      newValue: sanitizeForAudit(member),
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
    const { familyId, userId } = await requireRole(["owner", "admin"]);

    // Get old value for audit
    const [oldMember] = await db
      .select()
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.id),
          eq(schema.members.familyId, familyId)
        )
      )
      .limit(1);

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

    // Audit log
    if (member && oldMember) {
      logUpdate({
        familyId,
        userId,
        entityType: "member",
        entityId: member.id,
        oldValue: sanitizeForAudit(oldMember),
        newValue: sanitizeForAudit(member),
      });
    }

    return member;
  });

const DeleteMemberSchema = z.object({
  id: z.number(),
});

export const deleteMember = createServerFn({ method: "POST" })
  .inputValidator(DeleteMemberSchema)
  .handler(async ({ data }) => {
    const { familyId, userId } = await requireRole(["owner", "admin"]);

    // Get old value for audit before deleting
    const [oldMember] = await db
      .select()
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.id),
          eq(schema.members.familyId, familyId)
        )
      )
      .limit(1);

    await db
      .delete(schema.members)
      .where(
        and(
          eq(schema.members.id, data.id),
          eq(schema.members.familyId, familyId)
        )
      );

    // Audit log
    if (oldMember) {
      logDelete({
        familyId,
        userId,
        entityType: "member",
        entityId: data.id,
        oldValue: sanitizeForAudit(oldMember),
      });
    }

    return { success: true };
  });

// Re-export Member type for backwards compatibility
export type { Member } from "../db/schema";
