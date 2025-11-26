import { Database } from "bun:sqlite";
import path from "node:path";

const dbFileName = process.env.DB_NAME || "family-todos.db";
const dbPath = path.join(process.cwd(), dbFileName);

let dbInstance: Database | null = null;

export function getDb(): Database {
  if (!dbInstance) {
    dbInstance = new Database(dbPath, { create: true });
    dbInstance.run("PRAGMA foreign_keys = ON");
    dbInstance.run("PRAGMA journal_mode = WAL");
  }
  return dbInstance;
}

export const db = getDb();

export function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      is_parent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add is_parent column if it doesn't exist
  try {
    db.run(`ALTER TABLE members ADD COLUMN is_parent INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS timeslots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      start_time TEXT,
      end_time TEXT,
      recurrence_type TEXT CHECK(recurrence_type IN ('daily', 'weekly', 'monthly', 'none')) DEFAULT 'none',
      recurrence_days TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS timeslot_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timeslot_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (timeslot_id) REFERENCES timeslots(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(timeslot_id, member_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      symbol TEXT,
      position INTEGER DEFAULT 0,
      points INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add points column if it doesn't exist
  try {
    db.run(`ALTER TABLE todos ADD COLUMN points INTEGER DEFAULT 5`);
  } catch {
    // Column already exists
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS todo_timeslots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      todo_id INTEGER NOT NULL,
      timeslot_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
      FOREIGN KEY (timeslot_id) REFERENCES timeslots(id) ON DELETE CASCADE,
      UNIQUE(todo_id, timeslot_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS todo_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      todo_id INTEGER NOT NULL,
      timeslot_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completion_date DATE NOT NULL,
      FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
      FOREIGN KEY (timeslot_id) REFERENCES timeslots(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(todo_id, timeslot_id, member_id, completion_date)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS timeslot_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timeslot_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completion_date DATE NOT NULL,
      FOREIGN KEY (timeslot_id) REFERENCES timeslots(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(timeslot_id, member_id, completion_date)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_timeslot_members_timeslot
    ON timeslot_members(timeslot_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_timeslot_members_member
    ON timeslot_members(member_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_todo_timeslots_todo
    ON todo_timeslots(todo_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_todo_timeslots_timeslot
    ON todo_timeslots(timeslot_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_completions_date
    ON todo_completions(completion_date)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_timeslot_completions_date
    ON timeslot_completions(completion_date)
  `);

  // Statistics and rewards tables
  db.run(`
    CREATE TABLE IF NOT EXISTS member_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      total_stars INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      total_tasks_completed INTEGER DEFAULT 0,
      total_timeslots_completed INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      last_completion_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(member_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      requirement_type TEXT NOT NULL,
      requirement_value INTEGER NOT NULL,
      star_reward INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS member_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      achievement_id INTEGER NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
      UNIQUE(member_id, achievement_id)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_member_stats_member
    ON member_stats(member_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_member_achievements_member
    ON member_achievements(member_id)
  `);

  // Rewards system tables
  db.run(`
    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      point_cost INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS point_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('earned', 'redeemed', 'bonus', 'adjustment')),
      description TEXT,
      todo_id INTEGER,
      reward_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE SET NULL,
      FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reward_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      reward_id INTEGER NOT NULL,
      points_spent INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'fulfilled')) DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      processed_by INTEGER,
      notes TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
      FOREIGN KEY (processed_by) REFERENCES admin_users(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_point_transactions_member
    ON point_transactions(member_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_reward_redemptions_member
    ON reward_redemptions(member_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status
    ON reward_redemptions(status)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS layout_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_admin_users_username
    ON admin_users(username)
  `);

  seedInitialData();
}

export function clearDatabase() {
  const tables = ['member_achievements', 'achievements', 'member_stats', 'timeslot_completions', 'todo_completions', 'todo_timeslots', 'todos', 'timeslot_members', 'timeslots', 'members'];

  for (const table of tables) {
    try {
      db.run(`DELETE FROM ${table}`);
    } catch (error) {
      // Table might not exist yet
    }
  }
  console.log('Database cleared');
}

function seedInitialData() {
  const existingMembers = db.query<{ count: number }, []>(
    'SELECT COUNT(*) as count FROM members'
  ).get();

  // For test database, always reseed
  const isTestDb = process.env.DB_NAME === 'family-todos-test.db';

  if (isTestDb || (existingMembers && existingMembers.count === 0)) {
    if (isTestDb && existingMembers && existingMembers.count > 0) {
      clearDatabase();
    }
    const members = [
      { name: 'Salama', avatar: null },
      { name: 'Farida', avatar: null },
      { name: 'Omar', avatar: null },
      { name: 'Ali', avatar: null },
    ];

    const memberIds: number[] = [];
    for (const member of members) {
      const result = db.run(
        'INSERT INTO members (name, avatar) VALUES (?, ?)',
        [member.name, member.avatar]
      );
      memberIds.push(result.lastInsertRowid as number);
    }

    const [salamaId, faridaId, omarId, aliId] = memberIds;

    const timeslots = [
      {
        name: 'Morning Routine',
        description: 'Get ready for the day',
        start_time: '07:00',
        end_time: '08:30',
        recurrence_type: 'daily' as const,
        recurrence_days: null,
        member_ids: [omarId, aliId],
      },
      {
        name: 'Homework Time',
        description: 'Complete school assignments',
        start_time: '16:00',
        end_time: '17:00',
        recurrence_type: 'weekly' as const,
        recurrence_days: 'Mon,Tue,Wed,Thu,Sun',
        member_ids: [omarId],
      },
      {
        name: 'Bedtime Routine',
        description: 'Prepare for sleep',
        start_time: '19:30',
        end_time: '20:30',
        recurrence_type: 'daily' as const,
        recurrence_days: null,
        member_ids: [omarId, aliId],
      },
      {
        name: 'Nap Time',
        description: 'Afternoon rest',
        start_time: '14:00',
        end_time: '15:30',
        recurrence_type: 'daily' as const,
        recurrence_days: null,
        member_ids: [aliId],
      },
      {
        name: 'Weekly Planning',
        description: 'Plan the week ahead',
        start_time: '09:00',
        end_time: '10:00',
        recurrence_type: 'weekly' as const,
        recurrence_days: 'Fri',
        member_ids: [salamaId, faridaId],
      },
      {
        name: 'Grocery Shopping',
        description: 'Weekly grocery run',
        start_time: '10:00',
        end_time: '12:00',
        recurrence_type: 'weekly' as const,
        recurrence_days: 'Thu',
        member_ids: [faridaId],
      },
    ];

    const timeslotIds: number[] = [];
    for (const timeslot of timeslots) {
      const result = db.run(
        `INSERT INTO timeslots
        (name, description, start_time, end_time, recurrence_type, recurrence_days)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          timeslot.name,
          timeslot.description,
          timeslot.start_time,
          timeslot.end_time,
          timeslot.recurrence_type,
          timeslot.recurrence_days,
        ]
      );
      const timeslotId = result.lastInsertRowid as number;
      timeslotIds.push(timeslotId);

      for (const memberId of timeslot.member_ids) {
        db.run(
          `INSERT INTO timeslot_members (timeslot_id, member_id) VALUES (?, ?)`,
          [timeslotId, memberId]
        );
      }
    }

    const morningRoutineId = timeslotIds[0];
    const homeworkId = timeslotIds[1];
    const bedtimeId = timeslotIds[2];
    const napTimeId = timeslotIds[3];

    const todos = [
      { title: 'Brush Teeth', symbol: '🦷', position: 1, timeslot_ids: [morningRoutineId, bedtimeId] },
      { title: 'Get Dressed', symbol: '👕', position: 2, timeslot_ids: [morningRoutineId] },
      { title: 'Eat Breakfast', symbol: '🍳', position: 3, timeslot_ids: [morningRoutineId] },
      { title: 'Pack School Bag', symbol: '🎒', position: 4, timeslot_ids: [morningRoutineId] },
      { title: 'Reading Practice', symbol: '📖', position: 1, timeslot_ids: [homeworkId] },
      { title: 'Math Exercises', symbol: '🔢', position: 2, timeslot_ids: [homeworkId] },
      { title: 'Writing Practice', symbol: '✏️', position: 3, timeslot_ids: [homeworkId] },
      { title: 'Put Toys Away', symbol: '🧸', position: 1, timeslot_ids: [bedtimeId, napTimeId] },
      { title: 'Change into Pajamas', symbol: '👔', position: 3, timeslot_ids: [bedtimeId] },
      { title: 'Read Story', symbol: '📚', position: 4, timeslot_ids: [bedtimeId] },
    ];

    for (const todo of todos) {
      const result = db.run(
        `INSERT INTO todos (title, symbol, position) VALUES (?, ?, ?)`,
        [todo.title, todo.symbol, todo.position]
      );
      const todoId = result.lastInsertRowid as number;

      for (const timeslotId of todo.timeslot_ids) {
        db.run(
          `INSERT INTO todo_timeslots (todo_id, timeslot_id) VALUES (?, ?)`,
          [todoId, timeslotId]
        );
      }
    }

    // Seed achievements
    const achievements = [
      { name: 'First Steps', description: 'Complete your first task', icon: '🌟', requirement_type: 'tasks_completed', requirement_value: 1, star_reward: 5 },
      { name: 'Getting Started', description: 'Complete 10 tasks', icon: '⭐', requirement_type: 'tasks_completed', requirement_value: 10, star_reward: 10 },
      { name: 'Task Master', description: 'Complete 50 tasks', icon: '🏆', requirement_type: 'tasks_completed', requirement_value: 50, star_reward: 25 },
      { name: 'Century Club', description: 'Complete 100 tasks', icon: '💯', requirement_type: 'tasks_completed', requirement_value: 100, star_reward: 50 },

      { name: 'Morning Champion', description: 'Complete all morning tasks 7 days in a row', icon: '🌅', requirement_type: 'streak', requirement_value: 7, star_reward: 20 },
      { name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '📅', requirement_type: 'streak', requirement_value: 7, star_reward: 15 },
      { name: 'Unstoppable', description: 'Maintain a 30-day streak', icon: '🔥', requirement_type: 'streak', requirement_value: 30, star_reward: 100 },

      { name: 'Perfect Day', description: 'Complete all tasks in one day', icon: '✨', requirement_type: 'perfect_day', requirement_value: 1, star_reward: 10 },
      { name: 'Perfect Week', description: 'Complete all tasks for 7 days straight', icon: '🌈', requirement_type: 'perfect_week', requirement_value: 1, star_reward: 50 },

      { name: 'Speed Demon', description: 'Complete 5 tasks before 8 AM', icon: '⚡', requirement_type: 'early_bird', requirement_value: 5, star_reward: 15 },
      { name: 'Night Owl Pro', description: 'Complete bedtime routine 10 times', icon: '🦉', requirement_type: 'timeslots_completed', requirement_value: 10, star_reward: 20 },

      { name: 'Star Collector', description: 'Earn 100 stars', icon: '🌠', requirement_type: 'stars', requirement_value: 100, star_reward: 25 },
      { name: 'Super Star', description: 'Earn 500 stars', icon: '💫', requirement_type: 'stars', requirement_value: 500, star_reward: 50 },
    ];

    for (const achievement of achievements) {
      try {
        db.run(
          `INSERT INTO achievements (name, description, icon, requirement_type, requirement_value, star_reward)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [achievement.name, achievement.description, achievement.icon, achievement.requirement_type, achievement.requirement_value, achievement.star_reward]
        );
      } catch {
        // Achievement might already exist
      }
    }

    // Initialize stats for each member
    for (const memberId of memberIds) {
      try {
        db.run(
          `INSERT INTO member_stats (member_id) VALUES (?)`,
          [memberId]
        );
      } catch {
        // Stats might already exist
      }
    }

    console.log('Database seeded with initial family members, timeslots, todos, and achievements');
  }

  // Create default admin user if none exists
  const existingAdmin = db.query<{ count: number }, []>(
    'SELECT COUNT(*) as count FROM admin_users'
  ).get();

  if (existingAdmin && existingAdmin.count === 0) {
    const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'changeme123';

    // Use sync password hashing for initialization
    const passwordHash = Bun.password.hashSync(defaultPassword, {
      algorithm: 'argon2id',
      memoryCost: 65536,
      timeCost: 3,
    });

    db.run(
      'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
      [defaultUsername, passwordHash]
    );

    console.log(`Default admin user created. Username: ${defaultUsername}, Password: ${defaultPassword}`);
    console.log('IMPORTANT: Change the default password immediately!');
  }
}

// Re-export types from separate file for client-safe imports
export type {
  Member,
  Timeslot,
  TimeslotMember,
  Todo,
  TodoTimeslot,
  TodoCompletion,
  TimeslotCompletion,
  MemberStats,
  Achievement,
  MemberAchievement,
  LayoutSettingRow,
  AdminUser,
  Reward,
  PointTransaction,
  RewardRedemption,
} from "./types";

initializeDatabase();
