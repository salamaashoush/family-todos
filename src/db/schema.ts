import { Database } from "bun:sqlite";
import path from "node:path";

const dbPath = path.join(process.cwd(), "family-todos.db");
export const db = new Database(dbPath, { create: true });

db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA journal_mode = WAL");

export function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS timeslots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      start_time TEXT,
      end_time TEXT,
      recurrence_type TEXT CHECK(recurrence_type IN ('daily', 'weekly', 'monthly', 'none')) DEFAULT 'none',
      recurrence_days TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timeslot_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      symbol TEXT,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (timeslot_id) REFERENCES timeslots(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS todo_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      todo_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completion_date DATE NOT NULL,
      FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(todo_id, member_id, completion_date)
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
    CREATE INDEX IF NOT EXISTS idx_timeslots_member
    ON timeslots(member_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_todos_timeslot
    ON todos(timeslot_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_completions_date
    ON todo_completions(completion_date)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_timeslot_completions_date
    ON timeslot_completions(completion_date)
  `);

  seedInitialData();
}

function seedInitialData() {
  const existingMembers = db.query<{ count: number }, []>(
    'SELECT COUNT(*) as count FROM members'
  ).get();

  if (existingMembers && existingMembers.count === 0) {
    const members = [
      { name: 'Salama', avatar: null, is_admin: 1 },
      { name: 'Farida', avatar: null, is_admin: 1 },
      { name: 'Omar', avatar: null, is_admin: 0 },
      { name: 'Ali', avatar: null, is_admin: 0 },
    ];

    const memberIds: number[] = [];
    for (const member of members) {
      const result = db.run(
        'INSERT INTO members (name, avatar, is_admin) VALUES (?, ?, ?)',
        [member.name, member.avatar, member.is_admin]
      );
      memberIds.push(result.lastInsertRowid as number);
    }

    const [salamaId, faridaId, omarId, aliId] = memberIds;

    const timeslots = [
      {
        member_id: omarId,
        name: 'Morning Routine',
        description: 'Get ready for the day',
        start_time: '07:00',
        end_time: '08:00',
        recurrence_type: 'daily' as const,
        recurrence_days: null,
      },
      {
        member_id: omarId,
        name: 'Homework Time',
        description: 'Complete school assignments',
        start_time: '16:00',
        end_time: '17:00',
        recurrence_type: 'weekly' as const,
        recurrence_days: 'Mon,Tue,Wed,Thu,Sun',
      },
      {
        member_id: omarId,
        name: 'Bedtime Routine',
        description: 'Prepare for sleep',
        start_time: '20:00',
        end_time: '20:30',
        recurrence_type: 'daily' as const,
        recurrence_days: null,
      },
      {
        member_id: aliId,
        name: 'Morning Routine',
        description: 'Get ready for the day',
        start_time: '08:00',
        end_time: '09:00',
        recurrence_type: 'daily' as const,
        recurrence_days: null,
      },
      {
        member_id: aliId,
        name: 'Nap Time',
        description: 'Afternoon rest',
        start_time: '14:00',
        end_time: '15:30',
        recurrence_type: 'daily' as const,
        recurrence_days: null,
      },
      {
        member_id: aliId,
        name: 'Bedtime Routine',
        description: 'Prepare for sleep',
        start_time: '19:30',
        end_time: '20:00',
        recurrence_type: 'daily' as const,
        recurrence_days: null,
      },
      {
        member_id: salamaId,
        name: 'Weekly Planning',
        description: 'Plan the week ahead',
        start_time: '09:00',
        end_time: '10:00',
        recurrence_type: 'weekly' as const,
        recurrence_days: 'Fri',
      },
      {
        member_id: faridaId,
        name: 'Grocery Shopping',
        description: 'Weekly grocery run',
        start_time: '10:00',
        end_time: '12:00',
        recurrence_type: 'weekly' as const,
        recurrence_days: 'Thu',
      },
    ];

    const timeslotIds: number[] = [];
    for (const timeslot of timeslots) {
      const result = db.run(
        `INSERT INTO timeslots
        (member_id, name, description, start_time, end_time, recurrence_type, recurrence_days)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          timeslot.member_id,
          timeslot.name,
          timeslot.description,
          timeslot.start_time,
          timeslot.end_time,
          timeslot.recurrence_type,
          timeslot.recurrence_days,
        ]
      );
      timeslotIds.push(result.lastInsertRowid as number);
    }

    const omarMorningId = timeslotIds[0];
    const omarHomeworkId = timeslotIds[1];
    const omarBedtimeId = timeslotIds[2];
    const aliMorningId = timeslotIds[3];
    const aliBedtimeId = timeslotIds[5];

    const todos = [
      { timeslot_id: omarMorningId, title: 'Brush Teeth', symbol: '🦷', position: 1 },
      { timeslot_id: omarMorningId, title: 'Get Dressed', symbol: '👕', position: 2 },
      { timeslot_id: omarMorningId, title: 'Eat Breakfast', symbol: '🍳', position: 3 },
      { timeslot_id: omarMorningId, title: 'Pack School Bag', symbol: '🎒', position: 4 },

      { timeslot_id: omarHomeworkId, title: 'Reading Practice', symbol: '📖', position: 1 },
      { timeslot_id: omarHomeworkId, title: 'Math Exercises', symbol: '🔢', position: 2 },
      { timeslot_id: omarHomeworkId, title: 'Writing Practice', symbol: '✏️', position: 3 },

      { timeslot_id: omarBedtimeId, title: 'Put Toys Away', symbol: '🧸', position: 1 },
      { timeslot_id: omarBedtimeId, title: 'Brush Teeth', symbol: '🦷', position: 2 },
      { timeslot_id: omarBedtimeId, title: 'Change into Pajamas', symbol: '👔', position: 3 },
      { timeslot_id: omarBedtimeId, title: 'Read Story', symbol: '📚', position: 4 },

      { timeslot_id: aliMorningId, title: 'Brush Teeth', symbol: '🦷', position: 1 },
      { timeslot_id: aliMorningId, title: 'Get Dressed', symbol: '👕', position: 2 },
      { timeslot_id: aliMorningId, title: 'Eat Breakfast', symbol: '🥣', position: 3 },

      { timeslot_id: aliBedtimeId, title: 'Put Toys Away', symbol: '🧸', position: 1 },
      { timeslot_id: aliBedtimeId, title: 'Brush Teeth', symbol: '🦷', position: 2 },
      { timeslot_id: aliBedtimeId, title: 'Change into Pajamas', symbol: '👔', position: 3 },
    ];

    for (const todo of todos) {
      db.run(
        `INSERT INTO todos (timeslot_id, title, symbol, position)
        VALUES (?, ?, ?, ?)`,
        [todo.timeslot_id, todo.title, todo.symbol, todo.position]
      );
    }

    console.log('Database seeded with initial family members, timeslots, and todos');
  }
}

export type Member = {
  id: number;
  name: string;
  avatar: string | null;
  is_admin: number;
  created_at: string;
  updated_at: string;
};

export type Timeslot = {
  id: number;
  member_id: number;
  name: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  recurrence_type: "daily" | "weekly" | "monthly" | "none";
  recurrence_days: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type Todo = {
  id: number;
  timeslot_id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  symbol: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type TodoCompletion = {
  id: number;
  todo_id: number;
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

initializeDatabase();
