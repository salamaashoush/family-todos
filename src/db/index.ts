import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set");
}

// Create Bun SQL client
const client = new SQL(connectionString);

// Create drizzle instance with schema for relational queries
export const db = drizzle({ client, schema });

// Export schema for use in queries
export { schema };

// Export types
export type Database = typeof db;
