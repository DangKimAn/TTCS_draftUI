/*
  Warnings:

  - Converts legacy text status columns to PostgreSQL enum columns in place.
  - Existing lower-case or title-case values are normalized with UPPER(...) before casting.

*/
-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TimesheetStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MISSING_OUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MonthlyTimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "NotificationRelatedType" AS ENUM ('WARNING', 'LEAVE', 'TIMESHEET');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "WarningLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- DropIndex
DROP INDEX IF EXISTS "request_corrections_timesheetEntryID_status_idx";

-- DropIndex
DROP INDEX IF EXISTS "request_corrections_userID_status_idx";

-- Normalize legacy values before casting.
UPDATE "timesheet_entries"
SET "status" = CASE LOWER(COALESCE("status", 'PENDING'))
    WHEN 'accepted' THEN 'APPROVED'
    WHEN 'approved' THEN 'APPROVED'
    WHEN 'denied' THEN 'REJECTED'
    WHEN 'rejected' THEN 'REJECTED'
    WHEN 'missing out' THEN 'MISSING_OUT'
    WHEN 'missing_out' THEN 'MISSING_OUT'
    ELSE 'PENDING'
END;

UPDATE "monthly_timesheets"
SET "status" = CASE LOWER(COALESCE("status", 'DRAFT'))
    WHEN 'accepted' THEN 'APPROVED'
    WHEN 'approved' THEN 'APPROVED'
    WHEN 'submitted' THEN 'SUBMITTED'
    WHEN 'rejected' THEN 'REJECTED'
    ELSE 'DRAFT'
END;

UPDATE "leave_applications"
SET "status" = CASE LOWER(COALESCE("status", 'PENDING'))
    WHEN 'accepted' THEN 'APPROVED'
    WHEN 'approved' THEN 'APPROVED'
    WHEN 'denied' THEN 'REJECTED'
    WHEN 'rejected' THEN 'REJECTED'
    WHEN 'cancelled' THEN 'CANCELLED'
    WHEN 'canceled' THEN 'CANCELLED'
    ELSE 'PENDING'
END;

UPDATE "request_corrections"
SET "status" = CASE LOWER(COALESCE("status", 'PENDING'))
    WHEN 'accepted' THEN 'APPROVED'
    WHEN 'approved' THEN 'APPROVED'
    WHEN 'denied' THEN 'REJECTED'
    WHEN 'rejected' THEN 'REJECTED'
    WHEN 'missing out' THEN 'MISSING_OUT'
    WHEN 'missing_out' THEN 'MISSING_OUT'
    ELSE 'PENDING'
END;

UPDATE "notifications"
SET "relatedType" = UPPER("relatedType")
WHERE "relatedType" IS NOT NULL;

UPDATE "warnings"
SET "level" = UPPER(COALESCE("level", 'LOW'));

-- AlterTable
ALTER TABLE "leave_applications"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "LeaveStatus" USING "status"::"LeaveStatus",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "monthly_timesheets"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "MonthlyTimesheetStatus" USING "status"::"MonthlyTimesheetStatus",
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "notifications"
ALTER COLUMN "relatedType" TYPE "NotificationRelatedType" USING "relatedType"::"NotificationRelatedType";

-- AlterTable
ALTER TABLE "request_corrections"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "TimesheetStatus" USING "status"::"TimesheetStatus",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "timesheet_entries"
ADD COLUMN IF NOT EXISTS "deviceInfo" TEXT,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "TimesheetStatus" USING "status"::"TimesheetStatus",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "warnings"
ALTER COLUMN "level" DROP DEFAULT,
ALTER COLUMN "level" TYPE "WarningLevel" USING "level"::"WarningLevel",
ALTER COLUMN "level" SET DEFAULT 'LOW';
