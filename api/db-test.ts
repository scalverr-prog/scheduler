import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { patients } from "../drizzle/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "DATABASE_URL not set" });
    }

    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    const result = await db.select().from(patients);

    res.status(200).json({
      message: "Database connection successful!",
      patientCount: result.length,
      patients: result.slice(0, 3), // Show first 3 patients
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      error: "Database error",
      details: String(error),
    });
  }
}
