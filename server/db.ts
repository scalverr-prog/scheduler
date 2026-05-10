import { eq, or, inArray, sql } from "drizzle-orm";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { InsertUser, users, patients, InsertPatient, activities, InsertActivity, rooms, activityTypes, auditLogs, InsertAuditLog, staffSpecializations } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg> | null = null;

// Detect if running in serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      if (isServerless) {
        // Use Neon serverless driver for Vercel/Lambda
        const sql = neon(process.env.DATABASE_URL);
        _db = drizzleNeon(sql);
      } else {
        // Use node-postgres for local development
        _db = drizzlePg(process.env.DATABASE_URL);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL uses onConflictDoUpdate instead of onDuplicateKeyUpdate
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * PATIENT QUERIES
 */
export async function getPatients() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(patients);
}

export async function getPatientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPatientByMRN(mrn: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(patients).where(eq(patients.mrn, mrn)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPatient(data: InsertPatient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // PostgreSQL returns rows directly with RETURNING clause
  const result = await db.insert(patients).values(data).returning({ id: patients.id });
  return { insertId: result[0]?.id };
}

export async function updatePatient(id: number, data: Partial<InsertPatient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(patients).set(data).where(eq(patients.id, id));
}

export async function deletePatient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(patients).where(eq(patients.id, id));
}

/**
 * ACTIVITY QUERIES
 */
export async function getActivities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activities);
}

export async function getActivityById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActivitiesByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activities).where(eq(activities.patientId, patientId));
}

/**
 * Get staff name by ID (for PMD and Sedationist display)
 */
export async function getStaffNameById(userId: number) {
  const db = await getDb();
  if (!db) return "Unknown Staff";
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0].name || "Unknown Staff" : "Unknown Staff";
}

/**
 * Get staff specialization by user ID
 */
export async function getStaffSpecialization(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(staffSpecializations).where(eq(staffSpecializations.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createActivity(data: InsertActivity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Clean up the data - remove undefined, null, and empty string values for optional fields
  // Required fields: patientId, activityTypeId, title, startTime, endTime, createdBy
  const requiredFields = ['patientId', 'activityTypeId', 'title', 'startTime', 'endTime', 'createdBy'];
  const cleanData: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    // Always include required fields
    if (requiredFields.includes(key)) {
      cleanData[key] = value;
      continue;
    }
    // Skip null, undefined, and empty strings for optional fields
    if (value === undefined || value === null || value === '') {
      continue;
    }
    cleanData[key] = value;
  }

  console.log("Creating activity with clean data:", JSON.stringify(cleanData, null, 2));

  try {
    return await db.insert(activities).values(cleanData as InsertActivity);
  } catch (error: any) {
    // Log full error details for debugging
    console.error("=== DATABASE INSERT ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error detail:", error.detail);
    console.error("Error constraint:", error.constraint);
    console.error("Clean data:", JSON.stringify(cleanData, null, 2));
    // Re-throw original error to preserve stack trace
    throw error;
  }
}

export async function updateActivity(id: number, data: Partial<InsertActivity>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(activities).set(data).where(eq(activities.id, id));
}

export async function deleteActivity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(activities).where(eq(activities.id, id));
}

/**
 * ROOM QUERIES
 */
export async function getRooms() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rooms);
}

export async function getRoomById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createRoom(data: { name: string; type: string; capacity?: number; isActive?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(rooms).values({
    name: data.name,
    type: data.type as any,
    capacity: data.capacity || 1,
    isActive: data.isActive ?? 1,
  }).returning({ id: rooms.id });
  return { insertId: result[0]?.id };
}

export async function updateRoom(id: number, data: Partial<{ name: string; type: string; capacity: number; isActive: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(rooms).set(data as any).where(eq(rooms.id, id));
}

export async function deleteRoom(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(rooms).where(eq(rooms.id, id));
}

/**
 * ACTIVITY TYPE QUERIES
 */
export async function getActivityTypes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityTypes);
}

/**
 * AUDIT LOG QUERIES
 */
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(auditLogs).values(data);
}

export async function getAuditLogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs);
}

/**
 * STAFF QUERIES
 */
export async function getStaff() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(
    or(eq(users.role, "staff"), eq(users.role, "admin"))
  );
}

export async function getStaffWithSpecializations() {
  const db = await getDb();
  if (!db) return [];

  const staffUsers = await db.select().from(users).where(
    or(eq(users.role, "staff"), eq(users.role, "admin"))
  );

  const staffWithSpecs = await Promise.all(
    staffUsers.map(async (staff) => {
      const specs = await db.select().from(staffSpecializations).where(
        eq(staffSpecializations.userId, staff.id)
      );
      return {
        ...staff,
        specializations: specs.map(s => s.specialization)
      };
    })
  );

  return staffWithSpecs;
}

/**
 * Create a new staff member (doctor)
 */
export async function createStaffMember(name: string, specialization?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate a unique openId for the new staff
  const openId = `staff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Auto-add credential suffix based on specialization
  let formattedName = name.trim();
  const nurseRoles = ["Nurse"];
  const techRoles = ["Technician"];

  // Only add suffix if not already present
  if (specialization && !formattedName.match(/,\s*(MD|RN|DO)$/i)) {
    if (nurseRoles.includes(specialization)) {
      formattedName = `${formattedName}, RN`;
    } else if (!techRoles.includes(specialization)) {
      // All other medical staff get MD
      formattedName = `${formattedName}, MD`;
    }
  }

  // PostgreSQL returns rows directly with RETURNING clause
  const result = await db.insert(users).values({
    openId,
    name: formattedName,
    role: "staff",
  }).returning({ id: users.id });

  const insertId = result[0]?.id;

  // Add specialization if provided
  if (specialization && insertId) {
    await db.insert(staffSpecializations).values({
      userId: insertId,
      specialization: specialization as any,
      isActive: 1,
    });
  }

  return { insertId };
}
