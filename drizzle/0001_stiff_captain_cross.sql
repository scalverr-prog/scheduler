CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`activityTypeId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`roomId` int,
	`assignedStaffIds` text,
	`status` enum('Requested','Scheduled','Confirmed','In Progress','Completed','Cancelled') DEFAULT 'Scheduled',
	`notes` text,
	`isRecurring` int DEFAULT 0,
	`recurringPattern` varchar(50),
	`recurringEndDate` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`colorCode` varchar(7) DEFAULT '#008B8B',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` enum('CREATE','UPDATE','DELETE','CANCEL','CONFIRM') NOT NULL,
	`entityType` enum('Activity','Patient','Room','User') NOT NULL,
	`entityId` int NOT NULL,
	`userId` int NOT NULL,
	`previousValues` text,
	`newValues` text,
	`reason` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mrn` varchar(50) NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`dateOfBirth` timestamp,
	`gender` enum('M','F','Other','Prefer not to say'),
	`wardRoom` varchar(100),
	`medicalNotes` text,
	`allergies` text,
	`status` enum('Active','Inactive','Discharged','Transferred') DEFAULT 'Active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_mrn_unique` UNIQUE(`mrn`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('OR','Procedure Room','Imaging','Consultation','Ward','ICU','Other') NOT NULL,
	`capacity` int,
	`isActive` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `rooms_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','staff') NOT NULL DEFAULT 'user';