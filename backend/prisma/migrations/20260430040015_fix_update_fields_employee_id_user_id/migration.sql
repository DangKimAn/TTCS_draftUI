/*
  Warnings:

  - You are about to drop the column `employeeID` on the `monthly_timesheets` table. All the data in the column will be lost.
  - You are about to drop the column `employeeID` on the `payrolls` table. All the data in the column will be lost.
  - Added the required column `userID` to the `monthly_timesheets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userID` to the `payrolls` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "monthly_timesheets" DROP CONSTRAINT "monthly_timesheets_employeeID_fkey";

-- DropForeignKey
ALTER TABLE "payrolls" DROP CONSTRAINT "payrolls_employeeID_fkey";

-- AlterTable
ALTER TABLE "monthly_timesheets" DROP COLUMN "employeeID",
ADD COLUMN     "userID" UUID NOT NULL;

-- AlterTable
ALTER TABLE "payrolls" DROP COLUMN "employeeID",
ADD COLUMN     "userID" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "monthly_timesheets" ADD CONSTRAINT "monthly_timesheets_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;
