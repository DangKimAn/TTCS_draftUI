-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_managerID_fkey";

-- DropForeignKey
ALTER TABLE "leave_applications" DROP CONSTRAINT "leave_applications_reviewerID_fkey";

-- DropForeignKey
ALTER TABLE "monthly_timesheets" DROP CONSTRAINT "monthly_timesheets_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_departmentID_fkey";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentID_fkey" FOREIGN KEY ("departmentID") REFERENCES "departments"("departmentID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_managerID_fkey" FOREIGN KEY ("managerID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_timesheets" ADD CONSTRAINT "monthly_timesheets_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_reviewerID_fkey" FOREIGN KEY ("reviewerID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;
