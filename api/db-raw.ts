import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "DATABASE_URL not set" });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Simple raw query
    const result = await sql`SELECT COUNT(*) as count FROM patients`;

    res.status(200).json({
      message: "Raw database query successful!",
      result: result,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      error: "Database error",
      details: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
