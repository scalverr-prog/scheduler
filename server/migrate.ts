import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("[Migrate] No DATABASE_URL found, skipping migrations");
    return;
  }

  console.log("[Migrate] Running database migrations...");

  try {
    const db = drizzle(connectionString);
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("[Migrate] Migrations completed successfully!");
  } catch (error) {
    console.error("[Migrate] Migration failed:", error);
    // Don't exit with error - let the app start anyway
  }
}

runMigrations();
