import { drizzle } from "drizzle-orm/bun-sql";
import { eq } from "drizzle-orm";
import { SQL } from "bun";
import { adminUsers, userFamilies } from "./schema/auth";
import { families } from "./schema/families";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(databaseUrl: string, retries = MAX_RETRIES): Promise<SQL> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[seed-admin] Connecting to database (attempt ${attempt}/${retries})...`);
      const sql = new SQL(databaseUrl);
      await sql.query("SELECT 1");
      console.log("[seed-admin] Database connection established!");
      return sql;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`[seed-admin] Connection failed, retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error("Failed to connect to database after max retries");
}

async function seedDefaultAdmin() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("[seed-admin] DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

  // If env vars are not set, skip - the SQL seed will handle it with defaults
  if (!adminUsername || !adminPassword) {
    console.log("[seed-admin] DEFAULT_ADMIN_USERNAME or DEFAULT_ADMIN_PASSWORD not set");
    console.log("[seed-admin] Using hardcoded defaults from SQL seed (admin/admin123)");
    console.log("[seed-admin] Password change will be required on first login");
    process.exit(0);
  }

  console.log(`[seed-admin] Creating/updating admin user: ${adminUsername}`);

  const sql = await connectWithRetry(databaseUrl);
  const db = drizzle({ client: sql });

  // Hash the password
  const passwordHash = await Bun.password.hash(adminPassword, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });

  // Check if admin user already exists
  const [existingAdmin] = await db
    .select({ id: adminUsers.id, username: adminUsers.username })
    .from(adminUsers)
    .where(eq(adminUsers.isSuperAdmin, true))
    .limit(1);

  if (existingAdmin) {
    // Update existing super admin
    console.log(`[seed-admin] Updating existing super admin (id: ${existingAdmin.id})`);
    await db
      .update(adminUsers)
      .set({
        username: adminUsername,
        passwordHash: passwordHash,
        // When using env vars, mark as if password was already changed (no prompt needed)
        isDefaultAdmin: false,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, existingAdmin.id));
    console.log("[seed-admin] Super admin updated successfully");
  } else {
    // Create new super admin
    console.log("[seed-admin] Creating new super admin");

    // First ensure default family exists
    const [existingFamily] = await db
      .select({ id: families.id })
      .from(families)
      .limit(1);

    let familyId: number;
    if (existingFamily) {
      familyId = existingFamily.id;
    } else {
      const [newFamily] = await db
        .insert(families)
        .values({
          name: "My Family",
          slug: "my-family",
          isOnboarded: true,
        })
        .returning({ id: families.id });
      familyId = newFamily.id;
    }

    // Create the admin user
    const [newAdmin] = await db
      .insert(adminUsers)
      .values({
        username: adminUsername,
        passwordHash: passwordHash,
        isSuperAdmin: true,
        isDefaultAdmin: false, // Not default when using env vars
        passwordChangedAt: new Date(), // Mark as changed so no prompt
        accountStatus: "active",
      })
      .returning({ id: adminUsers.id });

    // Link admin to family
    await db.insert(userFamilies).values({
      userId: newAdmin.id,
      familyId: familyId,
      role: "owner",
    });

    console.log("[seed-admin] Super admin created successfully");
  }

  sql.close();
  console.log("[seed-admin] Done!");
  process.exit(0);
}

seedDefaultAdmin().catch((err) => {
  console.error("[seed-admin] Failed:", err);
  process.exit(1);
});
