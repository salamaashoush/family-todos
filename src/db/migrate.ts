import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { SQL } from "bun";
import { sql as drizzleSql } from "drizzle-orm";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(databaseUrl: string, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempting to connect to database (attempt ${attempt}/${retries})...`);
      const client = new SQL(databaseUrl);
      const db = drizzle({ client });
      // Test the connection with drizzle
      await db.execute(drizzleSql`SELECT 1`);
      console.log("Database connection established!");
      return { client, db };
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`Connection failed, retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error("Failed to connect to database after max retries");
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL or POSTGRES_URL environment variable is not set");
    process.exit(1);
  }

  const { client, db } = await connectWithRetry(databaseUrl);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("Migrations complete!");
  client.close();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
