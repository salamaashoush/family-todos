export type Member = {
  id: number;
  name: string;
  avatar: string | null;
  is_parent: number;
  created_at: string;
  updated_at: string;
};

export type Timeslot = {
  id: number;
  name: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  recurrence_type: "daily" | "weekly" | "monthly" | "none";
  recurrence_days: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  member_ids?: number[];
};

export type TimeslotMember = {
  id: number;
  timeslot_id: number;
  member_id: number;
  created_at: string;
};

export type Todo = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  symbol: string | null;
  position: number;
  points: number;
  created_at: string;
  updated_at: string;
  timeslot_ids?: number[];
};

export type TodoTimeslot = {
  id: number;
  todo_id: number;
  timeslot_id: number;
  created_at: string;
};

export type TodoCompletion = {
  id: number;
  todo_id: number;
  timeslot_id: number;
  member_id: number;
  completed_at: string;
  completion_date: string;
};

export type TimeslotCompletion = {
  id: number;
  timeslot_id: number;
  member_id: number;
  completed_at: string;
  completion_date: string;
};

export type MemberStats = {
  id: number;
  member_id: number;
  total_stars: number;
  current_streak: number;
  longest_streak: number;
  total_tasks_completed: number;
  total_timeslots_completed: number;
  level: number;
  last_completion_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Achievement = {
  id: number;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  star_reward: number;
  created_at: string;
};

export type MemberAchievement = {
  id: number;
  member_id: number;
  achievement_id: number;
  earned_at: string;
};

export type LayoutSettingRow = {
  id: number;
  key: string;
  value: string;
  updated_at: string;
};

export type AdminUser = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type Reward = {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  point_cost: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type PointTransaction = {
  id: number;
  member_id: number;
  amount: number;
  type: 'earned' | 'redeemed' | 'bonus' | 'adjustment';
  description: string | null;
  todo_id: number | null;
  reward_id: number | null;
  created_at: string;
};

export type RewardRedemption = {
  id: number;
  member_id: number;
  reward_id: number;
  points_spent: number;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  requested_at: string;
  processed_at: string | null;
  processed_by: number | null;
  notes: string | null;
};
