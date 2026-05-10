-- Add missing name columns to activities table
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "createdByName" varchar(100);
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "updatedByName" varchar(100);
