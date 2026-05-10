CREATE TYPE "public"."activity_status" AS ENUM('Pending', 'Requested', 'Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."admission_status" AS ENUM('Inpatient', 'Direct Admit', 'Subacute Facility');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'CONFIRM');--> statement-breakpoint
CREATE TYPE "public"."case_type" AS ENUM('Procedure', 'Direct Admit', 'Consultation', 'Follow-up');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('Activity', 'Patient', 'Room', 'User');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('M', 'F', 'Other', 'Prefer not to say');--> statement-breakpoint
CREATE TYPE "public"."patient_status" AS ENUM('Active', 'Inactive', 'Discharged', 'Transferred');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('Planned', 'Routine', 'Urgent', 'Emergent', 'Add-On');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('OR', 'Procedure Room', 'Imaging', 'Consultation', 'Ward', 'ICU', 'Other');--> statement-breakpoint
CREATE TYPE "public"."sedation_provider" AS ENUM('None', 'Intensivist', 'Anesthesia', 'Proceduralist');--> statement-breakpoint
CREATE TYPE "public"."sedation_type" AS ENUM('None', 'Conscious Sedation', 'Moderate Sedation', 'MAC', 'General Anesthesia');--> statement-breakpoint
CREATE TYPE "public"."service" AS ENUM('GI', 'Pulmonary', 'Cardiology', 'Radiology', 'Neurology', 'Orthopedics', 'General Surgery', 'Vascular', 'Urology', 'ENT', 'Oncology', 'Pain Management', 'Other');--> statement-breakpoint
CREATE TYPE "public"."specialization" AS ENUM('PMD', 'Sedationist', 'Nurse', 'Technician', 'Anesthesiologist', 'Other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'staff');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"patientId" integer NOT NULL,
	"activityTypeId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"roomId" integer,
	"assignedStaffIds" text,
	"pmdId" integer,
	"sedationistId" integer,
	"intervention" varchar(255),
	"service" "service" DEFAULT 'Other',
	"caseType" "case_type" DEFAULT 'Procedure',
	"priority" "priority" DEFAULT 'Routine',
	"sedationRequired" integer DEFAULT 0,
	"sedationType" "sedation_type" DEFAULT 'None',
	"sedationProvider" "sedation_provider" DEFAULT 'None',
	"preOpComplete" integer DEFAULT 0,
	"consentSigned" integer DEFAULT 0,
	"npoStatus" varchar(100),
	"status" "activity_status" DEFAULT 'Pending',
	"notes" text,
	"isRecurring" integer DEFAULT 0,
	"recurringPattern" varchar(50),
	"recurringEndDate" timestamp,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedBy" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"colorCode" varchar(7) DEFAULT '#008B8B',
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "activity_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" "audit_action" NOT NULL,
	"entityType" "entity_type" NOT NULL,
	"entityId" integer NOT NULL,
	"userId" integer NOT NULL,
	"previousValues" text,
	"newValues" text,
	"reason" text,
	"ipAddress" varchar(45),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"mrn" varchar(50) NOT NULL,
	"firstName" varchar(100) NOT NULL,
	"lastName" varchar(100) NOT NULL,
	"dateOfBirth" timestamp,
	"gender" "gender",
	"admissionStatus" "admission_status",
	"medicalNotes" text,
	"allergies" text,
	"status" "patient_status" DEFAULT 'Active',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_mrn_unique" UNIQUE("mrn")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "room_type" NOT NULL,
	"capacity" integer,
	"isActive" integer DEFAULT 1,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "staff_specializations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"specialization" "specialization" NOT NULL,
	"licensingNumber" varchar(100),
	"isActive" integer DEFAULT 1,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
