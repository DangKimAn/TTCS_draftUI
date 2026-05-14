/*
  Warnings:

  - You are about to drop the column `canSubmit` on the `monthly_timesheets` table. All the data in the column will be lost.
  - You are about to drop the column `reviewerID` on the `monthly_timesheets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userID,month,year]` on the table `monthly_timesheets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `duration` to the `leave_applications` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "monthly_timesheets" DROP CONSTRAINT "monthly_timesheets_reviewerID_fkey";

-- AlterTable
ALTER TABLE "leave_applications" ADD COLUMN     "duration" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "monthly_timesheets" DROP COLUMN "canSubmit",
DROP COLUMN "reviewerID",
ADD COLUMN     "approvedById" UUID;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "linkAvatar" DROP NOT NULL,
ALTER COLUMN "linkAvatar" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "monthly_timesheets_userID_month_year_key" ON "monthly_timesheets"("userID", "month", "year");

-- AddForeignKey
ALTER TABLE "monthly_timesheets" ADD CONSTRAINT "monthly_timesheets_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("userID") ON DELETE SET NULL ON UPDATE CASCADE;
