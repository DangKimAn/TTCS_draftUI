-- PostgreSQL baseline generated from backend/prisma/schema.prisma.
-- Prisma schema is the source of truth for Supabase/PostgreSQL deployments.

CREATE TABLE "roles" (
    "roleID" TEXT NOT NULL,
    "nameRole" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("roleID")
);

CREATE TABLE "departments" (
    "departmentID" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "managerID" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("departmentID")
);

CREATE TABLE "users" (
    "userID" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "linkAvatar" TEXT,
    "salaryCoefficient" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "birthday" TIMESTAMP(3),
    "remainDaysofLeave" INTEGER NOT NULL DEFAULT 12,
    "totalDaysofLeave" INTEGER NOT NULL DEFAULT 12,
    "isActive" BOOLEAN DEFAULT true,
    "refreshToken" TEXT,
    "roleId" TEXT NOT NULL,
    "departmentID" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userID")
);

CREATE TABLE "monthly_timesheets" (
    "monthlyTimesheetID" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reasonReject" TEXT,
    "approvedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "canSubmit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "monthly_timesheets_pkey" PRIMARY KEY ("monthlyTimesheetID")
);

CREATE TABLE "timesheet_entries" (
    "timesheetEntryID" TEXT NOT NULL,
    "monthlyTimesheetID" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3),
    "IPAddress" TEXT NOT NULL,
    "canRequestCorrection" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("timesheetEntryID")
);

CREATE TABLE "type_leaves" (
    "typeLeaveID" TEXT NOT NULL,
    "nameTypeLeave" TEXT NOT NULL,
    "hasSalary" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "type_leaves_pkey" PRIMARY KEY ("typeLeaveID")
);

CREATE TABLE "leave_applications" (
    "leaveApplicationID" TEXT NOT NULL,
    "senderID" TEXT NOT NULL,
    "reviewerID" TEXT,
    "typeLeaveID" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reasonReject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "leave_applications_pkey" PRIMARY KEY ("leaveApplicationID")
);

CREATE TABLE "notifications" (
    "notificationID" TEXT NOT NULL,
    "senderID" TEXT,
    "receiverID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedType" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notificationID")
);

CREATE TABLE "warnings" (
    "warningID" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "content" TEXT,
    "level" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warnings_pkey" PRIMARY KEY ("warningID")
);

CREATE TABLE "request_corrections" (
    "requestCorrectionID" TEXT NOT NULL,
    "monthlyTimesheetID" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reviewerID" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reasonReject" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_corrections_pkey" PRIMARY KEY ("requestCorrectionID")
);

CREATE TABLE "payrolls" (
    "payrollID" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "monthlyTimesheetID" TEXT NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "totalExtraHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSalaryByHours" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("payrollID")
);

CREATE UNIQUE INDEX "roles_nameRole_key" ON "roles"("nameRole");
CREATE UNIQUE INDEX "departments_departmentName_key" ON "departments"("departmentName");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "monthly_timesheets_userID_month_year_key" ON "monthly_timesheets"("userID", "month", "year");

ALTER TABLE "departments"
    ADD CONSTRAINT "departments_managerID_fkey"
    FOREIGN KEY ("managerID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users"
    ADD CONSTRAINT "users_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "roles"("roleID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users"
    ADD CONSTRAINT "users_departmentID_fkey"
    FOREIGN KEY ("departmentID") REFERENCES "departments"("departmentID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "monthly_timesheets"
    ADD CONSTRAINT "monthly_timesheets_userID_fkey"
    FOREIGN KEY ("userID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "monthly_timesheets"
    ADD CONSTRAINT "monthly_timesheets_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_monthlyTimesheetID_fkey"
    FOREIGN KEY ("monthlyTimesheetID") REFERENCES "monthly_timesheets"("monthlyTimesheetID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_applications"
    ADD CONSTRAINT "leave_applications_senderID_fkey"
    FOREIGN KEY ("senderID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_applications"
    ADD CONSTRAINT "leave_applications_reviewerID_fkey"
    FOREIGN KEY ("reviewerID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_applications"
    ADD CONSTRAINT "leave_applications_typeLeaveID_fkey"
    FOREIGN KEY ("typeLeaveID") REFERENCES "type_leaves"("typeLeaveID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_senderID_fkey"
    FOREIGN KEY ("senderID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_receiverID_fkey"
    FOREIGN KEY ("receiverID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "warnings"
    ADD CONSTRAINT "warnings_userID_fkey"
    FOREIGN KEY ("userID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "request_corrections"
    ADD CONSTRAINT "request_corrections_monthlyTimesheetID_fkey"
    FOREIGN KEY ("monthlyTimesheetID") REFERENCES "monthly_timesheets"("monthlyTimesheetID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "request_corrections"
    ADD CONSTRAINT "request_corrections_reviewerID_fkey"
    FOREIGN KEY ("reviewerID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payrolls"
    ADD CONSTRAINT "payrolls_userID_fkey"
    FOREIGN KEY ("userID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payrolls"
    ADD CONSTRAINT "payrolls_monthlyTimesheetID_fkey"
    FOREIGN KEY ("monthlyTimesheetID") REFERENCES "monthly_timesheets"("monthlyTimesheetID") ON DELETE RESTRICT ON UPDATE CASCADE;
