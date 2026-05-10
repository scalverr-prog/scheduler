import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Define enums for PostgreSQL
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "staff"]);
export const genderEnum = pgEnum("gender", ["M", "F", "Other", "Prefer not to say"]);
export const admissionStatusEnum = pgEnum("admission_status", ["Inpatient", "Direct Admit", "Subacute Facility"]);
export const patientStatusEnum = pgEnum("patient_status", ["Active", "Inactive", "Discharged", "Transferred"]);
export const roomTypeEnum = pgEnum("room_type", ["OR", "Procedure Room", "Imaging", "Interventional Radiology", "Consultation", "Ward", "ICU", "Other"]);
export const serviceEnum = pgEnum("service", [
  "GI", "Pulmonary", "Cardiology", "Radiology", "Neurology",
  "Orthopedics", "General Surgery", "Vascular", "Urology",
  "ENT", "Oncology", "Pain Management", "Other"
]);
export const caseTypeEnum = pgEnum("case_type", ["Procedure", "Direct Admit", "Consultation", "Follow-up"]);
export const priorityEnum = pgEnum("priority", ["Planned", "Routine", "Urgent", "Emergent", "Add-On"]);
export const sedationTypeEnum = pgEnum("sedation_type", ["None", "Conscious Sedation", "Moderate Sedation", "MAC", "General Anesthesia"]);
export const sedationProviderEnum = pgEnum("sedation_provider", ["None", "Intensivist", "Anesthesia", "Proceduralist"]);
export const activityStatusEnum = pgEnum("activity_status", ["Pending", "Requested", "Scheduled", "Confirmed", "In Progress", "Completed", "Cancelled"]);
export const auditActionEnum = pgEnum("audit_action", ["CREATE", "UPDATE", "DELETE", "CANCEL", "CONFIRM"]);
export const entityTypeEnum = pgEnum("entity_type", ["Activity", "Patient", "Room", "User"]);
export const specializationEnum = pgEnum("specialization", ["PMD", "Sedationist", "Nurse", "Technician", "Anesthesiologist", "Other", "Oncology", "Peds-Surgery", "Intensivist"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patients table
 */
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  mrn: varchar("mrn", { length: 50 }).notNull().unique(),
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

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

/**
 * Activity types
 */
export const activityTypes = pgTable("activity_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  colorCode: varchar("colorCode", { length: 7 }).default("#008B8B"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityType = typeof activityTypes.$inferSelect;
export type InsertActivityType = typeof activityTypes.$inferInsert;

/**
 * Rooms/Resources
 */
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  type: roomTypeEnum("type").notNull(),
  capacity: integer("capacity"),
  isActive: integer("isActive").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

/**
 * Activities/Appointments
 */
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  patientId: integer("patientId").notNull(),
  activityTypeId: integer("activityTypeId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  roomId: integer("roomId"),
  assignedStaffIds: text("assignedStaffIds"),
  pmdId: integer("pmdId"),
  sedationistId: integer("sedationistId"),
  intervention: varchar("intervention", { length: 255 }),
  service: serviceEnum("service").default("Other"),
  caseType: caseTypeEnum("caseType").default("Procedure"),
  priority: priorityEnum("priority").default("Routine"),
  sedationRequired: integer("sedationRequired").default(0),
  sedationType: sedationTypeEnum("sedationType").default("None"),
  sedationProvider: sedationProviderEnum("sedationProvider").default("None"),
  preOpComplete: integer("preOpComplete").default(0),
  consentSigned: integer("consentSigned").default(0),
  npoStatus: varchar("npoStatus", { length: 100 }),
  status: activityStatusEnum("status").default("Pending"),
  notes: text("notes"),
  isRecurring: integer("isRecurring").default(0),
  recurringPattern: varchar("recurringPattern", { length: 50 }),
  recurringEndDate: timestamp("recurringEndDate"),
  createdBy: integer("createdBy").notNull(),
  createdByName: varchar("createdByName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedBy: integer("updatedBy"),
  updatedByName: varchar("updatedByName", { length: 100 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

/**
 * Audit logs
 */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: auditActionEnum("action").notNull(),
  entityType: entityTypeEnum("entityType").notNull(),
  entityId: integer("entityId").notNull(),
  userId: integer("userId").notNull(),
  previousValues: text("previousValues"),
  newValues: text("newValues"),
  reason: text("reason"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Staff specializations
 */
export const staffSpecializations = pgTable("staff_specializations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  specialization: specializationEnum("specialization").notNull(),
  licensingNumber: varchar("licensingNumber", { length: 100 }),
  isActive: integer("isActive").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type StaffSpecialization = typeof staffSpecializations.$inferSelect;
export type InsertStaffSpecialization = typeof staffSpecializations.$inferInsert;
