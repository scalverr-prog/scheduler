import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "DATABASE_URL not set" });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Check patients and activities
    const patientCount = await sql`SELECT COUNT(*) as count FROM patients`;
    const activityCount = await sql`SELECT COUNT(*) as count FROM activities`;
    const activities = await sql`SELECT id, title, "startTime", status FROM activities ORDER BY "startTime" DESC LIMIT 5`;
    const activityTypes = await sql`SELECT id, name FROM activity_types ORDER BY id`;

    // Check actual table columns
    const activityColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'activities'
      ORDER BY ordinal_position
    `;

    // Run migration to add missing columns
    let migrationResult = "Not run";
    if (req.query.migrate === 'true') {
      try {
        await sql`ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "createdByName" varchar(100)`;
        await sql`ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "updatedByName" varchar(100)`;
        migrationResult = "Migration successful - added createdByName and updatedByName columns";
      } catch (migErr: any) {
        migrationResult = `Migration failed: ${migErr.message}`;
      }
    }

    // Test insert (dry run - we'll rollback)
    let testInsertResult = "Not tested";
    if (req.method === 'POST') {
      try {
        // Try a simple insert to see what error we get
        const testResult = await sql`
          INSERT INTO activities (
            "patientId", "activityTypeId", title, "startTime", "endTime",
            service, "caseType", priority, status, "createdBy"
          ) VALUES (
            1, 1, 'Test Activity', NOW(), NOW() + INTERVAL '30 minutes',
            'Oncology', 'Procedure', 'Planned', 'Pending', 1
          ) RETURNING id
        `;
        // Delete the test record
        if (testResult[0]?.id) {
          await sql`DELETE FROM activities WHERE id = ${testResult[0].id}`;
        }
        testInsertResult = "Insert test PASSED - database accepts inserts";
      } catch (insertError: any) {
        testInsertResult = `Insert test FAILED: ${insertError.message}`;
      }
    }

    res.status(200).json({
      message: "Raw database query successful!",
      patients: patientCount[0],
      activities: activityCount[0],
      activityTypes: activityTypes,
      recentActivities: activities,
      activityColumns: activityColumns,
      testInsert: testInsertResult,
      migrationResult: migrationResult,
      hint: "POST to this endpoint to test insert capability, add ?migrate=true to run migration"
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
