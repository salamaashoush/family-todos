import { drizzle } from "drizzle-orm/bun-sql";
import { sql as drizzleSql } from "drizzle-orm";
import { SQL } from "bun";
import { achievements } from "./schema/statistics";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(databaseUrl: string, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[seed-achievements] Connecting to database (attempt ${attempt}/${retries})...`);
      const client = new SQL(databaseUrl);
      const db = drizzle({ client });
      await db.execute(drizzleSql`SELECT 1`);
      console.log("[seed-achievements] Database connection established!");
      return { client, db };
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`[seed-achievements] Connection failed, retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error("Failed to connect to database after max retries");
}

// Global achievements available to all families
const globalAchievements = [
  // Task Completion Milestones
  {
    name: "First Steps",
    description: "Complete your very first task",
    icon: "first",
    requirementType: "tasks_completed",
    requirementValue: 1,
    starReward: 5,
    isGlobal: true,
  },
  {
    name: "Getting Started",
    description: "Complete 10 tasks",
    icon: "ten",
    requirementType: "tasks_completed",
    requirementValue: 10,
    starReward: 15,
    isGlobal: true,
  },
  {
    name: "Task Enthusiast",
    description: "Complete 25 tasks",
    icon: "twentyfive",
    requirementType: "tasks_completed",
    requirementValue: 25,
    starReward: 30,
    isGlobal: true,
  },
  {
    name: "Half Century",
    description: "Complete 50 tasks",
    icon: "fifty",
    requirementType: "tasks_completed",
    requirementValue: 50,
    starReward: 50,
    isGlobal: true,
  },
  {
    name: "Century Champion",
    description: "Complete 100 tasks",
    icon: "hundred",
    requirementType: "tasks_completed",
    requirementValue: 100,
    starReward: 100,
    isGlobal: true,
  },
  {
    name: "Task Master",
    description: "Complete 250 tasks",
    icon: "master",
    requirementType: "tasks_completed",
    requirementValue: 250,
    starReward: 200,
    isGlobal: true,
  },
  {
    name: "Task Legend",
    description: "Complete 500 tasks",
    icon: "legend",
    requirementType: "tasks_completed",
    requirementValue: 500,
    starReward: 400,
    isGlobal: true,
  },

  // Streak Achievements
  {
    name: "Consistency Starter",
    description: "Maintain a 3-day streak",
    icon: "streak3",
    requirementType: "streak",
    requirementValue: 3,
    starReward: 10,
    isGlobal: true,
  },
  {
    name: "Week Warrior",
    description: "Maintain a 7-day streak",
    icon: "streak7",
    requirementType: "streak",
    requirementValue: 7,
    starReward: 25,
    isGlobal: true,
  },
  {
    name: "Fortnight Force",
    description: "Maintain a 14-day streak",
    icon: "streak14",
    requirementType: "streak",
    requirementValue: 14,
    starReward: 50,
    isGlobal: true,
  },
  {
    name: "Monthly Marvel",
    description: "Maintain a 30-day streak",
    icon: "streak30",
    requirementType: "streak",
    requirementValue: 30,
    starReward: 100,
    isGlobal: true,
  },
  {
    name: "Streak Superstar",
    description: "Maintain a 60-day streak",
    icon: "streak60",
    requirementType: "streak",
    requirementValue: 60,
    starReward: 200,
    isGlobal: true,
  },
  {
    name: "Unstoppable",
    description: "Maintain a 100-day streak",
    icon: "streak100",
    requirementType: "streak",
    requirementValue: 100,
    starReward: 500,
    isGlobal: true,
  },

  // Level Achievements
  {
    name: "Rising Star",
    description: "Reach level 5",
    icon: "level5",
    requirementType: "level",
    requirementValue: 5,
    starReward: 20,
    isGlobal: true,
  },
  {
    name: "Double Digits",
    description: "Reach level 10",
    icon: "level10",
    requirementType: "level",
    requirementValue: 10,
    starReward: 50,
    isGlobal: true,
  },
  {
    name: "Quarter Century",
    description: "Reach level 25",
    icon: "level25",
    requirementType: "level",
    requirementValue: 25,
    starReward: 100,
    isGlobal: true,
  },
  {
    name: "High Achiever",
    description: "Reach level 50",
    icon: "level50",
    requirementType: "level",
    requirementValue: 50,
    starReward: 250,
    isGlobal: true,
  },
  {
    name: "Elite Status",
    description: "Reach level 100",
    icon: "level100",
    requirementType: "level",
    requirementValue: 100,
    starReward: 500,
    isGlobal: true,
  },

  // Routine Completion Achievements
  {
    name: "Routine Beginner",
    description: "Complete 10 daily routines",
    icon: "routine10",
    requirementType: "timeslots_completed",
    requirementValue: 10,
    starReward: 15,
    isGlobal: true,
  },
  {
    name: "Routine Regular",
    description: "Complete 50 daily routines",
    icon: "routine50",
    requirementType: "timeslots_completed",
    requirementValue: 50,
    starReward: 40,
    isGlobal: true,
  },
  {
    name: "Routine Pro",
    description: "Complete 100 daily routines",
    icon: "routine100",
    requirementType: "timeslots_completed",
    requirementValue: 100,
    starReward: 75,
    isGlobal: true,
  },
  {
    name: "Routine Master",
    description: "Complete 250 daily routines",
    icon: "routine250",
    requirementType: "timeslots_completed",
    requirementValue: 250,
    starReward: 150,
    isGlobal: true,
  },

  // Star Collection Achievements
  {
    name: "Star Collector",
    description: "Earn 100 stars total",
    icon: "stars100",
    requirementType: "stars",
    requirementValue: 100,
    starReward: 25,
    isGlobal: true,
  },
  {
    name: "Star Hoarder",
    description: "Earn 500 stars total",
    icon: "stars500",
    requirementType: "stars",
    requirementValue: 500,
    starReward: 75,
    isGlobal: true,
  },
  {
    name: "Star Rich",
    description: "Earn 1,000 stars total",
    icon: "stars1000",
    requirementType: "stars",
    requirementValue: 1000,
    starReward: 150,
    isGlobal: true,
  },
  {
    name: "Star Millionaire",
    description: "Earn 5,000 stars total",
    icon: "stars5000",
    requirementType: "stars",
    requirementValue: 5000,
    starReward: 500,
    isGlobal: true,
  },
];

async function seedAchievements() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error("[seed-achievements] DATABASE_URL or POSTGRES_URL environment variable is not set");
    process.exit(1);
  }

  const { client, db } = await connectWithRetry(databaseUrl);

  console.log("[seed-achievements] Seeding global achievements...");

  // Check if achievements already exist
  const existingAchievements = await db
    .select({ name: achievements.name })
    .from(achievements)
    .where(drizzleSql`${achievements.isGlobal} = true`);

  const existingNames = new Set(existingAchievements.map((a) => a.name));

  // Only insert achievements that don't already exist
  const newAchievements = globalAchievements.filter((a) => !existingNames.has(a.name));

  if (newAchievements.length === 0) {
    console.log("[seed-achievements] All global achievements already exist, skipping.");
  } else {
    await db.insert(achievements).values(newAchievements);
    console.log(`[seed-achievements] Inserted ${newAchievements.length} new global achievements.`);
  }

  client.close();
  console.log("[seed-achievements] Done!");
  process.exit(0);
}

seedAchievements().catch((err) => {
  console.error("[seed-achievements] Failed:", err);
  process.exit(1);
});
