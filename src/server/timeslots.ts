import { createServerFn } from "@tanstack/react-start";
import { db, type Timeslot, type TimeslotMember } from "../db/schema";
import { z } from "zod";

const GetTimeslotsSchema = z.object({
  member_id: z.number().optional(),
});

export const getTimeslots = createServerFn({ method: "GET" })
  .inputValidator(GetTimeslotsSchema)
  .handler(async ({ data }) => {
    let query = "SELECT * FROM timeslots WHERE is_active = 1";
    const params: number[] = [];

    query += " ORDER BY start_time";

    const timeslots = db.query<Timeslot, number[]>(query).all(...params);

    const timeslotsWithMembers = timeslots.map((timeslot: Timeslot) => {
      const members = db.query<TimeslotMember, [number]>(
        "SELECT * FROM timeslot_members WHERE timeslot_id = ?"
      ).all(timeslot.id);

      return {
        ...timeslot,
        member_ids: members.map((m: TimeslotMember) => m.member_id)
      };
    });

    if (data.member_id) {
      return timeslotsWithMembers.filter((t: Timeslot & { member_ids: number[] }) => t.member_ids.includes(data.member_id!));
    }

    return timeslotsWithMembers;
  });

const CreateTimeslotSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  recurrence_type: z.enum(["daily", "weekly", "monthly", "none"]).optional(),
  recurrence_days: z.string().optional(),
  member_ids: z.array(z.number()).min(1),
});

export const createTimeslot = createServerFn({ method: "POST" })
  .inputValidator(CreateTimeslotSchema)
  .handler(async ({ data }) => {
    const result = db.run(
      `INSERT INTO timeslots
      (name, description, start_time, end_time, recurrence_type, recurrence_days)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.description || null,
        data.start_time || null,
        data.end_time || null,
        data.recurrence_type || "none",
        data.recurrence_days || null,
      ]
    );

    const timeslotId = result.lastInsertRowid as number;

    for (const memberId of data.member_ids) {
      db.run(
        `INSERT INTO timeslot_members (timeslot_id, member_id) VALUES (?, ?)`,
        [timeslotId, memberId]
      );
    }

    const timeslot = db
      .query<Timeslot, [number]>("SELECT * FROM timeslots WHERE id = ?")
      .get(timeslotId);

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
  member_ids: z.array(z.number()).optional(),
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

    if (data.member_ids !== undefined) {
      db.run("DELETE FROM timeslot_members WHERE timeslot_id = ?", [data.id]);

      for (const memberId of data.member_ids) {
        db.run(
          `INSERT INTO timeslot_members (timeslot_id, member_id) VALUES (?, ?)`,
          [data.id, memberId]
        );
      }
    }

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
