import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { eq, or, and } from "drizzle-orm";
import { z } from "zod";
import {
  serial,
  text,
  integer,
  timestamp,
  varchar,
  pgTable,
  pgEnum,
} from "drizzle-orm/pg-core";

// Define enums inline
const userRoleEnum = pgEnum("user_role", ["user", "admin", "staff"]);
const genderEnum = pgEnum("gender", ["M", "F", "Other", "Prefer not to say"]);
const admissionStatusEnum = pgEnum("admission_status", ["Inpatient", "Direct Admit", "Subacute Facility"]);
const patientStatusEnum = pgEnum("patient_status", ["Active", "Inactive", "Discharged", "Transferred"]);
const roomTypeEnum = pgEnum("room_type", ["OR", "Procedure Room", "Imaging", "Consultation", "Ward", "ICU", "Other"]);
const activityStatusEnum = pgEnum("activity_status", ["Pending", "Requested", "Scheduled", "Confirmed", "In Progress", "Completed", "Cancelled"]);
const specializationEnum = pgEnum("specialization", ["PMD", "Sedationist", "Nurse", "Technician", "Anesthesiologist", "Other", "Oncology", "Peds-Surgery", "Intensivist"]);

// Define tables inline
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
});

const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  mrn: varchar("mrn", { length: 50 }).notNull(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  dateOfBirth: timestamp("dateOfBirth"),
  gender: genderEnum("gender"),
  admissionStatus: admissionStatusEnum("admissionStatus"),
  medicalNotes: text("medicalNotes"),
  allergies: text("allergies"),
  status: patientStatusEnum("status").default("Active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

const activityTypes = pgTable("activity_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  colorCode: varchar("colorCode", { length: 7 }).default("#008B8B"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: roomTypeEnum("type").notNull(),
  capacity: integer("capacity"),
  isActive: integer("isActive").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Additional enums for activities
const serviceEnum = pgEnum("service", [
  "GI", "Pulmonary", "Cardiology", "Radiology", "Neurology",
  "Orthopedics", "General Surgery", "Vascular", "Urology",
  "ENT", "Oncology", "Pain Management", "Other"
]);
const caseTypeEnum = pgEnum("case_type", ["Procedure", "Direct Admit", "Consultation", "Follow-up"]);
const priorityEnum = pgEnum("priority", ["Planned", "Routine", "Urgent", "Emergent", "Add-On"]);
const sedationTypeEnum = pgEnum("sedation_type", ["None", "Conscious Sedation", "Moderate Sedation", "MAC", "General Anesthesia"]);
const sedationProviderEnum = pgEnum("sedation_provider", ["None", "Intensivist", "Anesthesia", "Proceduralist"]);

const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  patientId: integer("patientId").notNull(),
  activityTypeId: integer("activityTypeId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  roomId: integer("roomId"),
  pmdId: integer("pmdId"),
  sedationistId: integer("sedationistId"),
  intervention: varchar("intervention", { length: 255 }),
  service: serviceEnum("service").default("Other"),
  caseType: caseTypeEnum("caseType").default("Procedure"),
  priority: priorityEnum("priority").default("Routine"),
  sedationRequired: integer("sedationRequired").default(0),
  sedationType: sedationTypeEnum("sedationType").default("None"),
  sedationProvider: sedationProviderEnum("sedationProvider").default("None"),
  status: activityStatusEnum("status").default("Pending"),
  notes: text("notes"),
  createdBy: integer("createdBy").notNull(),
  createdByName: varchar("createdByName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedBy: integer("updatedBy"),
  updatedByName: varchar("updatedByName", { length: 100 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

const staffSpecializations = pgTable("staff_specializations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  specialization: specializationEnum("specialization").notNull(),
  isActive: integer("isActive").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Initialize tRPC
const t = initTRPC.create({ transformer: superjson });

// Create database connection
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

// Define the router
const appRouter = t.router({
  patients: t.router({
    list: t.procedure.query(async () => {
      const db = getDb();
      return db.select().from(patients);
    }),
    create: t.procedure
      .input(z.object({
        mrn: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        dateOfBirth: z.date().optional(),
        gender: z.string().optional(),
        admissionStatus: z.string().optional(),
        medicalNotes: z.string().optional(),
        allergies: z.string().optional(),
        status: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        // Helper to convert empty strings to null
        const toNull = (val: any) => (val === "" || val === undefined) ? null : val;
        const mrn = input.mrn.trim();

        // Check if MRN already exists
        const existing = await db.select().from(patients).where(eq(patients.mrn, mrn));
        if (existing.length > 0) {
          throw new Error(`Patient with MRN ${mrn} already exists: ${existing[0].firstName} ${existing[0].lastName}`);
        }

        const result = await db.insert(patients).values({
          mrn: mrn,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          dateOfBirth: input.dateOfBirth || null,
          gender: toNull(input.gender) as any,
          admissionStatus: toNull(input.admissionStatus) as any,
          medicalNotes: toNull(input.medicalNotes),
          allergies: toNull(input.allergies),
          status: (toNull(input.status) as any) || "Active",
        }).returning({ id: patients.id });
        return { success: true, id: result[0]?.id };
      }),
    update: t.procedure
      .input(z.object({
        id: z.number(),
        mrn: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        dateOfBirth: z.date().optional(),
        gender: z.string().optional(),
        admissionStatus: z.string().optional(),
        medicalNotes: z.string().optional(),
        allergies: z.string().optional(),
        status: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const { id, ...updateData } = input;
        const cleanedData: Record<string, any> = { updatedAt: new Date() };

        if (updateData.mrn !== undefined) cleanedData.mrn = updateData.mrn;
        if (updateData.firstName !== undefined) cleanedData.firstName = updateData.firstName;
        if (updateData.lastName !== undefined) cleanedData.lastName = updateData.lastName;
        if (updateData.dateOfBirth !== undefined) cleanedData.dateOfBirth = updateData.dateOfBirth;
        if (updateData.gender !== undefined) cleanedData.gender = updateData.gender;
        if (updateData.admissionStatus !== undefined) cleanedData.admissionStatus = updateData.admissionStatus;
        if (updateData.medicalNotes !== undefined) cleanedData.medicalNotes = updateData.medicalNotes;
        if (updateData.allergies !== undefined) cleanedData.allergies = updateData.allergies;
        if (updateData.status !== undefined) cleanedData.status = updateData.status;

        await db.update(patients).set(cleanedData).where(eq(patients.id, id));
        return { success: true };
      }),
    delete: t.procedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        // Delete associated activities first
        await db.delete(activities).where(eq(activities.patientId, input.id));
        // Delete the patient
        await db.delete(patients).where(eq(patients.id, input.id));
        return { success: true };
      }),
  }),
  activities: t.router({
    list: t.procedure.query(async () => {
      const db = getDb();
      return db.select().from(activities);
    }),
    getActivityTypes: t.procedure.query(async () => {
      const db = getDb();
      return db.select().from(activityTypes);
    }),
    getRooms: t.procedure.query(async () => {
      const db = getDb();
      return db.select().from(rooms);
    }),
    getStaff: t.procedure.query(async () => {
      const db = getDb();
      const staffUsers = await db
        .select()
        .from(users)
        .where(or(eq(users.role, "staff"), eq(users.role, "admin")));

      const staffWithSpecs = await Promise.all(
        staffUsers.map(async (staff) => {
          const specs = await db
            .select()
            .from(staffSpecializations)
            .where(eq(staffSpecializations.userId, staff.id));
          return {
            ...staff,
            specializations: specs.map((s) => s.specialization),
          };
        })
      );

      return staffWithSpecs;
    }),
    create: t.procedure
      .input(z.object({
        patientId: z.number(),
        activityTypeId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        startTime: z.date(),
        endTime: z.date(),
        roomId: z.number().nullish(),
        pmdId: z.number().nullish(),
        sedationistId: z.number().nullish(),
        intervention: z.string().nullish(),
        service: z.string().nullish(),
        caseType: z.string().nullish(),
        priority: z.string().nullish(),
        sedationRequired: z.number().nullish(),
        sedationType: z.string().nullish(),
        sedationProvider: z.string().nullish(),
        status: z.string().nullish(),
        notes: z.string().nullish(),
        createdBy: z.number(),
        createdByName: z.string().nullish(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.insert(activities).values({
          patientId: input.patientId,
          activityTypeId: input.activityTypeId,
          title: input.title,
          description: input.description || null,
          startTime: input.startTime,
          endTime: input.endTime,
          roomId: input.roomId || null,
          pmdId: input.pmdId || null,
          sedationistId: input.sedationistId || null,
          intervention: input.intervention || null,
          service: (input.service as any) || "Other",
          caseType: (input.caseType as any) || "Procedure",
          priority: (input.priority as any) || "Routine",
          sedationRequired: input.sedationRequired || 0,
          sedationType: (input.sedationType as any) || "None",
          sedationProvider: (input.sedationProvider as any) || "None",
          status: (input.status as any) || "Pending",
          notes: input.notes || null,
          createdBy: input.createdBy,
          createdByName: input.createdByName || null,
          updatedBy: input.createdBy,
          updatedByName: input.createdByName || null,
        });
        return { success: true };
      }),
    update: t.procedure
      .input(z.object({
        id: z.number(),
        patientId: z.number().optional(),
        activityTypeId: z.number().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        roomId: z.number().nullish(),
        pmdId: z.number().nullish(),
        sedationistId: z.number().nullish(),
        intervention: z.string().nullish(),
        service: z.string().nullish(),
        caseType: z.string().nullish(),
        priority: z.string().nullish(),
        sedationRequired: z.number().nullish(),
        sedationType: z.string().nullish(),
        sedationProvider: z.string().nullish(),
        status: z.string().nullish(),
        notes: z.string().nullish(),
        updatedBy: z.number().nullish(),
        updatedByName: z.string().nullish(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const { id, ...updateData } = input;
        const cleanedData: Record<string, any> = { updatedAt: new Date() };

        // Only include fields that are defined
        if (updateData.patientId !== undefined) cleanedData.patientId = updateData.patientId;
        if (updateData.activityTypeId !== undefined) cleanedData.activityTypeId = updateData.activityTypeId;
        if (updateData.title !== undefined) cleanedData.title = updateData.title;
        if (updateData.description !== undefined) cleanedData.description = updateData.description;
        if (updateData.startTime !== undefined) cleanedData.startTime = updateData.startTime;
        if (updateData.endTime !== undefined) cleanedData.endTime = updateData.endTime;
        if (updateData.roomId !== undefined) cleanedData.roomId = updateData.roomId;
        if (updateData.pmdId !== undefined) cleanedData.pmdId = updateData.pmdId;
        if (updateData.sedationistId !== undefined) cleanedData.sedationistId = updateData.sedationistId;
        if (updateData.intervention !== undefined) cleanedData.intervention = updateData.intervention;
        if (updateData.service !== undefined) cleanedData.service = updateData.service;
        if (updateData.caseType !== undefined) cleanedData.caseType = updateData.caseType;
        if (updateData.priority !== undefined) cleanedData.priority = updateData.priority;
        if (updateData.sedationRequired !== undefined) cleanedData.sedationRequired = updateData.sedationRequired;
        if (updateData.sedationType !== undefined) cleanedData.sedationType = updateData.sedationType;
        if (updateData.sedationProvider !== undefined) cleanedData.sedationProvider = updateData.sedationProvider;
        if (updateData.status !== undefined) cleanedData.status = updateData.status;
        if (updateData.notes !== undefined) cleanedData.notes = updateData.notes;
        if (updateData.updatedBy !== undefined) cleanedData.updatedBy = updateData.updatedBy;
        if (updateData.updatedByName !== undefined) cleanedData.updatedByName = updateData.updatedByName;

        await db.update(activities).set(cleanedData).where(eq(activities.id, id));
        return { success: true };
      }),
    createStaff: t.procedure
      .input(z.object({
        name: z.string(),
        specialization: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const openId = `staff-${Date.now()}`;
        const [user] = await db.insert(users).values({
          openId,
          name: input.name,
          role: "staff",
        }).returning({ id: users.id });

        if (input.specialization) {
          await db.insert(staffSpecializations).values({
            userId: user.id,
            specialization: input.specialization as any,
          });
        }

        return { success: true, id: user.id };
      }),
    updateStaff: t.procedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        specialization: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();

        if (input.name) {
          await db.update(users).set({
            name: input.name,
            updatedAt: new Date()
          }).where(eq(users.id, input.id));
        }

        if (input.specialization) {
          await db.delete(staffSpecializations).where(eq(staffSpecializations.userId, input.id));
          await db.insert(staffSpecializations).values({
            userId: input.id,
            specialization: input.specialization as any,
          });
        }

        return { success: true };
      }),
    deleteStaff: t.procedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.delete(staffSpecializations).where(eq(staffSpecializations.userId, input.id));
        await db.delete(users).where(eq(users.id, input.id));
        return { success: true };
      }),
  }),
  rooms: t.router({
    list: t.procedure.query(async () => {
      const db = getDb();
      return db.select().from(rooms);
    }),
  }),
});

// Export type for client
export type AppRouter = typeof appRouter;

// Handler for Vercel serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = `${protocol}://${host}${req.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  }

  const request = new Request(url, {
    method: req.method || "GET",
    headers,
    body,
  });

  try {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: request,
      router: appRouter,
      createContext: () => ({}),
      onError: ({ error, path }) => {
        console.error(`[tRPC Error] ${path}:`, error);
      },
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const responseBody = await response.text();
    res.send(responseBody);
  } catch (error) {
    console.error("[tRPC Handler Error]:", error);
    res.status(500).json({ error: "Internal server error", details: String(error) });
  }
}
