import { createServerFn } from "@tanstack/react-start";
import { db, type Timeslot } from "../db/schema";
import { z } from "zod";

const GetTimeslotsSchema = z.object({
  member_id: z.number().optional(),
});

export const getTimeslots = createServerFn({ method: "GET" })
  .inputValidator(GetTimeslotsSchema)
  .handler(async ({ data }) => {
    let query = "SELECT * FROM timeslots WHERE is_active = 1";
    const params: number[] = [];

    if (data.member_id) {
      query += " AND member_id = ?";
      params.push(data.member_id);
    }

    query += " ORDER BY member_id, start_time";

    const timeslots = db.query<Timeslot, number[]>(query).all(...params);
    return timeslots;
  });

const CreateTimeslotSchema = z.object({
  member_id: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  recurrence_type: z.enum(["daily", "weekly", "monthly", "none"]).optional(),
  recurrence_days: z.string().optional(),
});

export const createTimeslot = createServerFn({ method: "POST" })
  .inputValidator(CreateTimeslotSchema)
  .handler(async ({ data }) => {
    const result = db.run(
      `INSERT INTO timeslots
      (member_id, name, description, start_time, end_time, recurrence_type, recurrence_days)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.member_id,
        data.name,
        data.description || null,
        data.start_time || null,
        data.end_time || null,
        data.recurrence_type || "none",
        data.recurrence_days || null,
      ]
    );

    const timeslot = db
      .query<Timeslot, [number]>("SELECT * FROM timeslots WHERE id = ?")
      .get(result.lastInsertRowid as number);

    return timeslot;
  });

const UpdateTimeslotSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  recurrence_type: z.enum(["daily", "weekly", "monthly", "none"]).optional(),
  recurrence_days: z.string().optional(),
  is_active: z.number().optional(),
});

export const updateTimeslot = createServerFn({ method: "POST" })
  .inputValidator(UpdateTimeslotSchema)
  .handler(async ({ data }) => {
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description);
    }
    if (data.start_time !== undefined) {
      updates.push("start_time = ?");
      values.push(data.start_time);
    }
    if (data.end_time !== undefined) {
      updates.push("end_time = ?");
      values.push(data.end_time);
    }
    if (data.recurrence_type !== undefined) {
      updates.push("recurrence_type = ?");
      values.push(data.recurrence_type);
    }
    if (data.recurrence_days !== undefined) {
      updates.push("recurrence_days = ?");
      values.push(data.recurrence_days);
    }
    if (data.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(data.is_active);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(data.id);

    db.run(`UPDATE timeslots SET ${updates.join(", ")} WHERE id = ?`, values);

    const timeslot = db
      .query<Timeslot, [number]>("SELECT * FROM timeslots WHERE id = ?")
      .get(data.id);

    return timeslot;
  });

const DeleteTimeslotSchema = z.object({
  id: z.number(),
});

export const deleteTimeslot = createServerFn({ method: "POST" })
  .inputValidator(DeleteTimeslotSchema)
  .handler(async ({ data }) => {
    db.run("DELETE FROM timeslots WHERE id = ?", [data.id]);
    return { success: true };
  });
