import { createServerFn } from "@tanstack/react-start";
import { db, type Reward, type PointTransaction, type RewardRedemption } from "../db/schema";
import { z } from "zod";

// Get all rewards
export const getRewards = createServerFn({ method: "GET" }).handler(async () => {
  return db.query<Reward, []>("SELECT * FROM rewards ORDER BY point_cost ASC").all();
});

// Get active rewards only
export const getActiveRewards = createServerFn({ method: "GET" }).handler(async () => {
  return db.query<Reward, []>("SELECT * FROM rewards WHERE is_active = 1 ORDER BY point_cost ASC").all();
});

// Create reward
const CreateRewardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  point_cost: z.number().min(1),
});

export const createReward = createServerFn({ method: "POST" })
  .inputValidator(CreateRewardSchema)
  .handler(async ({ data }) => {
    const result = db.run(
      `INSERT INTO rewards (name, description, icon, point_cost) VALUES (?, ?, ?, ?)`,
      [data.name, data.description || null, data.icon || null, data.point_cost]
    );
    return db.query<Reward, [number]>("SELECT * FROM rewards WHERE id = ?").get(result.lastInsertRowid as number);
  });

// Update reward
const UpdateRewardSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  point_cost: z.number().min(1).optional(),
  is_active: z.boolean().optional(),
});

export const updateReward = createServerFn({ method: "POST" })
  .inputValidator(UpdateRewardSchema)
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
    if (data.icon !== undefined) {
      updates.push("icon = ?");
      values.push(data.icon);
    }
    if (data.point_cost !== undefined) {
      updates.push("point_cost = ?");
      values.push(data.point_cost);
    }
    if (data.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(data.is_active ? 1 : 0);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(data.id);

    db.run(`UPDATE rewards SET ${updates.join(", ")} WHERE id = ?`, values);
    return db.query<Reward, [number]>("SELECT * FROM rewards WHERE id = ?").get(data.id);
  });

// Delete reward
const DeleteRewardSchema = z.object({
  id: z.number(),
});

export const deleteReward = createServerFn({ method: "POST" })
  .inputValidator(DeleteRewardSchema)
  .handler(async ({ data }) => {
    db.run("DELETE FROM rewards WHERE id = ?", [data.id]);
    return { success: true };
  });

// Get member point balance
const GetMemberPointsSchema = z.object({
  member_id: z.number(),
});

export const getMemberPoints = createServerFn({ method: "GET" })
  .inputValidator(GetMemberPointsSchema)
  .handler(async ({ data }) => {
    const result = db.query<{ total: number }, [number]>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM point_transactions WHERE member_id = ?`
    ).get(data.member_id);
    return result?.total || 0;
  });

// Get all member points (for leaderboard/overview)
export const getAllMemberPoints = createServerFn({ method: "GET" }).handler(async () => {
  return db.query<{ member_id: number; total: number }, []>(
    `SELECT member_id, COALESCE(SUM(amount), 0) as total
     FROM point_transactions
     GROUP BY member_id`
  ).all();
});

// Get point transactions for a member
const GetTransactionsSchema = z.object({
  member_id: z.number(),
  limit: z.number().optional(),
});

export const getMemberTransactions = createServerFn({ method: "GET" })
  .inputValidator(GetTransactionsSchema)
  .handler(async ({ data }) => {
    const limit = data.limit || 50;
    return db.query<PointTransaction, [number, number]>(
      `SELECT * FROM point_transactions WHERE member_id = ? ORDER BY created_at DESC LIMIT ?`
    ).all(data.member_id, limit);
  });

// Award points (when task is completed)
const AwardPointsSchema = z.object({
  member_id: z.number(),
  amount: z.number(),
  description: z.string(),
  todo_id: z.number().optional(),
});

export const awardPoints = createServerFn({ method: "POST" })
  .inputValidator(AwardPointsSchema)
  .handler(async ({ data }) => {
    const result = db.run(
      `INSERT INTO point_transactions (member_id, amount, type, description, todo_id) VALUES (?, ?, 'earned', ?, ?)`,
      [data.member_id, data.amount, data.description, data.todo_id || null]
    );
    return db.query<PointTransaction, [number]>(
      "SELECT * FROM point_transactions WHERE id = ?"
    ).get(result.lastInsertRowid as number);
  });

// Deduct points (for redemption - internal use)
const DeductPointsSchema = z.object({
  member_id: z.number(),
  amount: z.number(),
  description: z.string(),
  reward_id: z.number().optional(),
});

export const deductPoints = createServerFn({ method: "POST" })
  .inputValidator(DeductPointsSchema)
  .handler(async ({ data }) => {
    // Amount should be negative for deductions
    const result = db.run(
      `INSERT INTO point_transactions (member_id, amount, type, description, reward_id) VALUES (?, ?, 'redeemed', ?, ?)`,
      [data.member_id, -Math.abs(data.amount), data.description, data.reward_id || null]
    );
    return db.query<PointTransaction, [number]>(
      "SELECT * FROM point_transactions WHERE id = ?"
    ).get(result.lastInsertRowid as number);
  });

// Request reward redemption
const RequestRedemptionSchema = z.object({
  member_id: z.number(),
  reward_id: z.number(),
});

export const requestRedemption = createServerFn({ method: "POST" })
  .inputValidator(RequestRedemptionSchema)
  .handler(async ({ data }) => {
    // Get reward details
    const reward = db.query<Reward, [number]>("SELECT * FROM rewards WHERE id = ?").get(data.reward_id);
    if (!reward) {
      throw new Error("Reward not found");
    }
    if (!reward.is_active) {
      throw new Error("Reward is not available");
    }

    // Check member has enough points
    const balance = db.query<{ total: number }, [number]>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM point_transactions WHERE member_id = ?`
    ).get(data.member_id);

    if ((balance?.total || 0) < reward.point_cost) {
      throw new Error("Insufficient points");
    }

    // Create redemption request
    const result = db.run(
      `INSERT INTO reward_redemptions (member_id, reward_id, points_spent, status) VALUES (?, ?, ?, 'pending')`,
      [data.member_id, data.reward_id, reward.point_cost]
    );

    return db.query<RewardRedemption, [number]>(
      "SELECT * FROM reward_redemptions WHERE id = ?"
    ).get(result.lastInsertRowid as number);
  });

// Get pending redemptions (for admin)
export const getPendingRedemptions = createServerFn({ method: "GET" }).handler(async () => {
  return db.query<RewardRedemption & { member_name: string; reward_name: string }, []>(
    `SELECT rr.*, m.name as member_name, r.name as reward_name
     FROM reward_redemptions rr
     JOIN members m ON rr.member_id = m.id
     JOIN rewards r ON rr.reward_id = r.id
     WHERE rr.status = 'pending'
     ORDER BY rr.requested_at ASC`
  ).all();
});

// Get all redemptions for a member
const GetMemberRedemptionsSchema = z.object({
  member_id: z.number(),
});

export const getMemberRedemptions = createServerFn({ method: "GET" })
  .inputValidator(GetMemberRedemptionsSchema)
  .handler(async ({ data }) => {
    return db.query<RewardRedemption & { reward_name: string; reward_icon: string | null }, [number]>(
      `SELECT rr.*, r.name as reward_name, r.icon as reward_icon
       FROM reward_redemptions rr
       JOIN rewards r ON rr.reward_id = r.id
       WHERE rr.member_id = ?
       ORDER BY rr.requested_at DESC`
    ).all(data.member_id);
  });

// Process redemption (approve/reject/fulfill)
const ProcessRedemptionSchema = z.object({
  id: z.number(),
  status: z.enum(['approved', 'rejected', 'fulfilled']),
  admin_user_id: z.number(),
  notes: z.string().optional(),
});

export const processRedemption = createServerFn({ method: "POST" })
  .inputValidator(ProcessRedemptionSchema)
  .handler(async ({ data }) => {
    const redemption = db.query<RewardRedemption, [number]>(
      "SELECT * FROM reward_redemptions WHERE id = ?"
    ).get(data.id);

    if (!redemption) {
      throw new Error("Redemption not found");
    }

    if (redemption.status !== 'pending' && redemption.status !== 'approved') {
      throw new Error("Redemption cannot be processed");
    }

    // If approving or fulfilling, deduct points
    if ((data.status === 'approved' || data.status === 'fulfilled') && redemption.status === 'pending') {
      const reward = db.query<Reward, [number]>("SELECT * FROM rewards WHERE id = ?").get(redemption.reward_id);

      db.run(
        `INSERT INTO point_transactions (member_id, amount, type, description, reward_id) VALUES (?, ?, 'redeemed', ?, ?)`,
        [redemption.member_id, -redemption.points_spent, `Redeemed: ${reward?.name || 'Unknown reward'}`, redemption.reward_id]
      );
    }

    // If rejecting after approval, refund points
    if (data.status === 'rejected' && redemption.status === 'approved') {
      const reward = db.query<Reward, [number]>("SELECT * FROM rewards WHERE id = ?").get(redemption.reward_id);

      db.run(
        `INSERT INTO point_transactions (member_id, amount, type, description, reward_id) VALUES (?, ?, 'adjustment', ?, ?)`,
        [redemption.member_id, redemption.points_spent, `Refund: ${reward?.name || 'Unknown reward'} (rejected)`, redemption.reward_id]
      );
    }

    db.run(
      `UPDATE reward_redemptions SET status = ?, processed_at = CURRENT_TIMESTAMP, processed_by = ?, notes = ? WHERE id = ?`,
      [data.status, data.admin_user_id, data.notes || null, data.id]
    );

    return db.query<RewardRedemption, [number]>(
      "SELECT * FROM reward_redemptions WHERE id = ?"
    ).get(data.id);
  });
