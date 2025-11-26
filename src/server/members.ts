import { createServerFn } from "@tanstack/react-start";
import { db, type Member } from "../db/schema";
import { z } from "zod";

export const getMembers = createServerFn({ method: "GET" }).handler(
  async () => {
    const members = db
      .query<Member, []>("SELECT * FROM members ORDER BY created_at ASC")
      .all();
    return members;
  }
);

const CreateMemberSchema = z.object({
  name: z.string().min(1),
  avatar: z.string().optional(),
  is_parent: z.boolean().optional(),
});

export const createMember = createServerFn({ method: "POST" })
  .inputValidator(CreateMemberSchema)
  .handler(async ({ data }) => {
    const result = db.run(
      "INSERT INTO members (name, avatar, is_parent) VALUES (?, ?, ?)",
      [data.name, data.avatar || null, data.is_parent ? 1 : 0]
    );

    const member = db
      .query<Member, [number]>("SELECT * FROM members WHERE id = ?")
      .get(result.lastInsertRowid as number);

    return member;
  });

const UpdateMemberSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
  is_parent: z.boolean().optional(),
});

export const updateMember = createServerFn({ method: "POST" })
  .inputValidator(UpdateMemberSchema)
  .handler(async ({ data }) => {
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.avatar !== undefined) {
      updates.push("avatar = ?");
      values.push(data.avatar);
    }
    if (data.is_parent !== undefined) {
      updates.push("is_parent = ?");
      values.push(data.is_parent ? 1 : 0);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(data.id);

    db.run(`UPDATE members SET ${updates.join(", ")} WHERE id = ?`, values);

    const member = db
      .query<Member, [number]>("SELECT * FROM members WHERE id = ?")
      .get(data.id);

    return member;
  });

const DeleteMemberSchema = z.object({
  id: z.number(),
});

export const deleteMember = createServerFn({ method: "POST" })
  .inputValidator(DeleteMemberSchema)
  .handler(async ({ data }) => {
    db.run("DELETE FROM members WHERE id = ?", [data.id]);
    return { success: true };
  });
