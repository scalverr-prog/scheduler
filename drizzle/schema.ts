import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "staff"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patients table: stores patient information including demographics and ward assignment
 */
export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  mrn: varchar("mrn", { length: 50 }).notNull().unique(), // Medical Record Number
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  dateOfBirth: timestamp("dateOfBirth"),
  gender: mysqlEnum("gender", ["M", "F", "Other", "Prefer not to say"]),
  admissionStatus: mysqlEnum("admissionStatus", ["Inpatient", "Direct Admit", "Subacute Facility"]),
  medicalNotes: text("medicalNotes"),
  allergies: text("allergies"),
  status: mysqlEnum("status", ["Active", "Inactive", "Discharged", "Transferred"]).default("Active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

/**
 * Activity types: defines the types of activities that can be scheduled
 */
export const activityTypes = mysqlTable("activity_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  colorCode: varchar("colorCode", { length: 7 }).default("#008B8B"), // Hex color for UI display
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityType = typeof activityTypes.$inferSelect;
export type InsertActivityType = typeof activityTypes.$inferInsert;

/**
 * Rooms/Resources: physical spaces and equipment that can be scheduled
 */
export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  type: mysqlEnum("type", ["OR", "Procedure Room", "Imaging", "Consultation", "Ward", "ICU", "Other"]).notNull(),
  capacity: int("capacity"),
  isActive: int("isActive").default(1), // 1 = active, 0 = inactive
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

/**
 * Activities/Appointments: scheduled events linking patients, staff, and resources
 */
export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  activityTypeId: int("activityTypeId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  roomId: int("roomId"), // Optional: may not all activities require a room
  assignedStaffIds: text("assignedStaffIds"), // JSON array of staff user IDs
  pmdId: int("pmdId"), // Primary Medical Doctor / Attending
  sedationistId: int("sedationistId"), // Sedationist staff member
  intervention: varchar("intervention", { length: 255 }), // Type of intervention/procedure
  // New fields for procedure/admit scheduling
  service: mysqlEnum("service", [
    "GI", "Pulmonary", "Cardiology", "Radiology", "Neurology",
    "Orthopedics", "General Surgery", "Vascular", "Urology",
    "ENT", "Oncology", "Pain Management", "Other"
  ]).default("Other"),
  caseType: mysqlEnum("caseType", ["Procedure", "Direct Admit", "Consultation", "Follow-up"]).default("Procedure"),
  priority: mysqlEnum("priority", ["Planned", "Routine", "Urgent", "Emergent", "Add-On"]).default("Routine"),
  sedationRequired: int("sedationRequired").default(0), // 0 = no, 1 = yes
  sedationType: mysqlEnum("sedationType", ["None", "Conscious Sedation", "Moderate Sedation", "MAC", "General Anesthesia"]).default("None"),
  sedationProvider: mysqlEnum("sedationProvider", ["None", "Intensivist", "Anesthesia", "Proceduralist"]).default("None"),
  preOpComplete: int("preOpComplete").default(0), // Pre-op checklist complete
  consentSigned: int("consentSigned").default(0), // Consent form signed
  npoStatus: varchar("npoStatus", { length: 100 }), // NPO since when
  status: mysqlEnum("status", ["Pending", "Requested", "Scheduled", "Confirmed", "In Progress", "Completed", "Cancelled"]).default("Pending"),
  notes: text("notes"),
  isRecurring: int("isRecurring").default(0),
  recurringPattern: varchar("recurringPattern", { length: 50 }), // e.g., "daily", "weekly", "monthly"
  recurringEndDate: timestamp("recurringEndDate"),
  createdBy: int("createdBy").notNull(), // User ID who created this activity
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedBy: int("updatedBy"), // User ID who last updated this activity
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

/**
 * Audit logs: comprehensive tracking of all schedule modifications
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  action: mysqlEnum("action", ["CREATE", "UPDATE", "DELETE", "CANCEL", "CONFIRM"]).notNull(),
  entityType: mysqlEnum("entityType", ["Activity", "Patient", "Room", "User"]).notNull(),
  entityId: int("entityId").notNull(),
  userId: int("userId").notNull(), // User who performed the action
  previousValues: text("previousValues"), // JSON of previous state (for updates/deletes)
  newValues: text("newValues"), // JSON of new state (for creates/updates)
  reason: text("reason"), // Optional: reason for the action
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Staff specializations: tracks staff roles and specializations (PMD, Sedationist, Nurse, etc.)
 */
export const staffSpecializations = mysqlTable("staff_specializations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  specialization: mysqlEnum("specialization", ["PMD", "Sedationist", "Nurse", "Technician", "Anesthesiologist", "Other"]).notNull(),
  licensingNumber: varchar("licensingNumber", { length: 100 }),
  isActive: int("isActive").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StaffSpecialization = typeof staffSpecializations.$inferSelect;
export type InsertStaffSpecialization = typeof staffSpecializations.$inferInsert;