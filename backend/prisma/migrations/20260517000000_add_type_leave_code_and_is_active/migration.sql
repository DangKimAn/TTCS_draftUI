-- AlterTable
ALTER TABLE "type_leaves"
ADD COLUMN "code" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing rows safely before enforcing NOT NULL/UNIQUE.
WITH numbered_type_leaves AS (
    SELECT
        "typeLeaveID",
        COALESCE(
            NULLIF(
                UPPER(
                    REGEXP_REPLACE(
                        REGEXP_REPLACE("nameTypeLeave", '[^[:alnum:]]+', '-', 'g'),
                        '(^-+|-+$)',
                        '',
                        'g'
                    )
                ),
                ''
            ),
            'LEAVE'
        ) AS base_code,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(
                NULLIF(
                    UPPER(
                        REGEXP_REPLACE(
                            REGEXP_REPLACE("nameTypeLeave", '[^[:alnum:]]+', '-', 'g'),
                            '(^-+|-+$)',
                            '',
                            'g'
                        )
                    ),
                    ''
                ),
                'LEAVE'
            )
            ORDER BY "typeLeaveID"
        ) AS duplicate_index
    FROM "type_leaves"
    WHERE "code" IS NULL
)
UPDATE "type_leaves" AS tl
SET "code" = CASE
    WHEN ntl.duplicate_index = 1 THEN LEFT(ntl.base_code, 24)
    ELSE LEFT(ntl.base_code, 20) || '-' || ntl.duplicate_index::TEXT
END
FROM numbered_type_leaves AS ntl
WHERE tl."typeLeaveID" = ntl."typeLeaveID";

ALTER TABLE "type_leaves" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "type_leaves_code_key" ON "type_leaves"("code");
