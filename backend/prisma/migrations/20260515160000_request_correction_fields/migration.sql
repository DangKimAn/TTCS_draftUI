ALTER TABLE "request_corrections"
    ADD COLUMN "timesheetEntryID" TEXT,
    ADD COLUMN "userID" TEXT,
    ADD COLUMN "proposedCheckIn" TIMESTAMP(3),
    ADD COLUMN "proposedCheckOut" TIMESTAMP(3);

UPDATE "request_corrections" AS rc
SET "userID" = mt."userID"
FROM "monthly_timesheets" AS mt
WHERE rc."monthlyTimesheetID" = mt."monthlyTimesheetID";

ALTER TABLE "request_corrections"
    ALTER COLUMN "userID" SET NOT NULL;

CREATE INDEX "request_corrections_userID_status_idx"
    ON "request_corrections"("userID", "status");

CREATE INDEX "request_corrections_timesheetEntryID_status_idx"
    ON "request_corrections"("timesheetEntryID", "status");

ALTER TABLE "request_corrections"
    ADD CONSTRAINT "request_corrections_timesheetEntryID_fkey"
    FOREIGN KEY ("timesheetEntryID") REFERENCES "timesheet_entries"("timesheetEntryID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "request_corrections"
    ADD CONSTRAINT "request_corrections_userID_fkey"
    FOREIGN KEY ("userID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;
