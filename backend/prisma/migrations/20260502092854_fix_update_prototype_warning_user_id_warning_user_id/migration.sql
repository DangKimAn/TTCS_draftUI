/*
  Warnings:

  - You are about to drop the column `userId` on the `warnings` table. All the data in the column will be lost.
  - Added the required column `userID` to the `warnings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "warnings" DROP CONSTRAINT "warnings_userId_fkey";

-- AlterTable
ALTER TABLE "warnings" DROP COLUMN "userId",
ADD COLUMN     "userID" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;
