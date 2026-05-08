import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { eq, or } from "drizzle-orm";
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
  status: activityStatusEnum("status").default("Pending"),
  notes: text("notes"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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
