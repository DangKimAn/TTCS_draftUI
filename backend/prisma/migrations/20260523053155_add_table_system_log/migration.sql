-- CreateTable
CREATE TABLE "system_logs" (
    "logID" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityID" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userID" TEXT,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("logID")
);

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("userID") ON DELETE SET NULL ON UPDATE CASCADE;
