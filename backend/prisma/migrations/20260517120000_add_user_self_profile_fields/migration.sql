-- Optional fields that employees may update through PATCH /user/me.
-- They are nullable to avoid rewriting existing user history.
ALTER TABLE "users"
ADD COLUMN "phone" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "emergencyContact" TEXT;
