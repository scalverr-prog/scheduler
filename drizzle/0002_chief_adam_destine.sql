CREATE TABLE `staff_specializations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`specialization` enum('PMD','Sedationist','Nurse','Technician','Anesthesiologist','Other') NOT NULL,
	`licensingNumber` varchar(100),
	`isActive` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_specializations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD `pmdId` int;--> statement-breakpoint
ALTER TABLE `activities` ADD `sedationistId` int;--> statement-breakpoint
ALTER TABLE `activities` ADD `intervention` varchar(255);