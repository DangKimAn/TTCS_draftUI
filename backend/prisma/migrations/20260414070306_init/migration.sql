-- CreateTable
CREATE TABLE "users" (
    "userID" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "linkAvatar" TEXT NOT NULL DEFAULT '../images/avatardefault.png',
    "salaryCoefficient" DOUBLE PRECISION NOT NULL,
    "birthday" TIMESTAMP(3),
    "remainDaysofLeave" INTEGER NOT NULL,
    "totalDaysofLeave" INTEGER NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "roleId" UUID NOT NULL,
    "departmentID" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userID")
);

-- CreateTable
CREATE TABLE "roles" (
    "roleID" UUID NOT NULL,
    "nameRole" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("roleID")
);

-- CreateTable
CREATE TABLE "departments" (
    "departmentID" UUID NOT NULL,
    "departmentName" TEXT NOT NULL,
    "managerID" UUID,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("departmentID")
);

-- CreateTable
CREATE TABLE "timesheet_entries" (
    "timesheetEntryID" UUID NOT NULL,
    "monthlyTimesheetID" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "checkIn" TIMESTAMP NOT NULL,
    "checkOut" TIMESTAMP,
    "IPAddress" TEXT NOT NULL,
    "canRequestCorrection" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("timesheetEntryID")
);

-- CreateTable
CREATE TABLE "monthly_timesheets" (
    "monthlyTimesheetID" UUID NOT NULL,
    "employeeID" UUID NOT NULL,
    "reviewerID" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reasonReject" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canSubmit" BOOLEAN NOT NULL DEFAULT false,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "monthly_timesheets_pkey" PRIMARY KEY ("monthlyTimesheetID")
);

-- CreateTable
CREATE TABLE "leave_applications" (
    "leaveApplicationID" UUID NOT NULL,
    "senderID" UUID NOT NULL,
    "reviewerID" UUID,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reasonReject" TEXT,
    "typeLeaveID" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "leave_applications_pkey" PRIMARY KEY ("leaveApplicationID")
);

-- CreateTable
CREATE TABLE "type_leaves" (
    "typeLeaveID" UUID NOT NULL,
    "nameTypeLeave" TEXT NOT NULL,
    "hasSalary" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "type_leaves_pkey" PRIMARY KEY ("typeLeaveID")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notificationID" UUID NOT NULL,
    "senderID" UUID NOT NULL,
    "receiverID" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedType" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notificationID")
);

-- CreateTable
CREATE TABLE "warnings" (
    "warningID" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "content" TEXT,
    "level" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warnings_pkey" PRIMARY KEY ("warningID")
);

-- CreateTable
CREATE TABLE "request_corrections" (
    "requestCorrectionID" UUID NOT NULL,
    "monthlyTimesheetID" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "reviewerID" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "reasonReject" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_corrections_pkey" PRIMARY KEY ("requestCorrectionID")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "payrollID" UUID NOT NULL,
    "employeeID" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "monthlyTimesheetID" UUID NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "totalExtraHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSalaryByHours" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("payrollID")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nameRole_key" ON "roles"("nameRole");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("roleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentID_fkey" FOREIGN KEY ("departmentID") REFERENCES "departments"("departmentID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_managerID_fkey" FOREIGN KEY ("managerID") REFERENCES "users"("userID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_monthlyTimesheetID_fkey" FOREIGN KEY ("monthlyTimesheetID") REFERENCES "monthly_timesheets"("monthlyTimesheetID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_timesheets" ADD CONSTRAINT "monthly_timesheets_employeeID_fkey" FOREIGN KEY ("employeeID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_timesheets" ADD CONSTRAINT "monthly_timesheets_reviewerID_fkey" FOREIGN KEY ("reviewerID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_senderID_fkey" FOREIGN KEY ("senderID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_reviewerID_fkey" FOREIGN KEY ("reviewerID") REFERENCES "users"("userID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_typeLeaveID_fkey" FOREIGN KEY ("typeLeaveID") REFERENCES "type_leaves"("typeLeaveID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_senderID_fkey" FOREIGN KEY ("senderID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_receiverID_fkey" FOREIGN KEY ("receiverID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_corrections" ADD CONSTRAINT "request_corrections_monthlyTimesheetID_fkey" FOREIGN KEY ("monthlyTimesheetID") REFERENCES "monthly_timesheets"("monthlyTimesheetID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_corrections" ADD CONSTRAINT "request_corrections_reviewerID_fkey" FOREIGN KEY ("reviewerID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employeeID_fkey" FOREIGN KEY ("employeeID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_monthlyTimesheetID_fkey" FOREIGN KEY ("monthlyTimesheetID") REFERENCES "monthly_timesheets"("monthlyTimesheetID") ON DELETE RESTRICT ON UPDATE CASCADE;
