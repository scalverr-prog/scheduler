ALTER TABLE `activities` ADD `service` enum('GI','Pulmonary','Cardiology','Radiology','Neurology','Orthopedics','General Surgery','Vascular','Urology','ENT','Oncology','Pain Management','Other') DEFAULT 'Other';--> statement-breakpoint
ALTER TABLE `activities` ADD `caseType` enum('Procedure','Direct Admit','Consultation','Follow-up') DEFAULT 'Procedure';--> statement-breakpoint
ALTER TABLE `activities` ADD `priority` enum('Routine','Urgent','Emergent','Add-On') DEFAULT 'Routine';--> statement-breakpoint
ALTER TABLE `activities` ADD `sedationRequired` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `activities` ADD `sedationType` enum('None','Moderate Sedation','MAC','General Anesthesia') DEFAULT 'None';--> statement-breakpoint
ALTER TABLE `activities` ADD `sedationProvider` enum('None','Intensivist','Anesthesia','Proceduralist') DEFAULT 'None';--> statement-breakpoint
ALTER TABLE `activities` ADD `preOpComplete` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `activities` ADD `consentSigned` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `activities` ADD `npoStatus` varchar(100);