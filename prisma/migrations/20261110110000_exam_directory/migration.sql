ALTER TABLE "exams"
ADD COLUMN "slug" TEXT,
ADD COLUMN "short_name" TEXT,
ADD COLUMN "level" TEXT NOT NULL DEFAULT 'national',
ADD COLUMN "state" TEXT,
ADD COLUMN "conducting_body" TEXT NOT NULL DEFAULT '',
ADD COLUMN "registration_url" TEXT,
ADD COLUMN "notification_url" TEXT,
ADD COLUMN "syllabus_url" TEXT,
ADD COLUMN "registration_start_date" DATE,
ADD COLUMN "registration_end_date" DATE,
ADD COLUMN "directory_exam_date" DATE,
ADD COLUMN "directory_admit_card_date" DATE,
ADD COLUMN "result_date" DATE,
ADD COLUMN "application_fee" JSONB,
ADD COLUMN "eligibility" TEXT,
ADD COLUMN "age_limit" TEXT,
ADD COLUMN "mode" TEXT,
ADD COLUMN "frequency" TEXT,
ADD COLUMN "last_verified_at" DATE;

UPDATE "exams"
SET "slug" = "id",
    "conducting_body" = "authority";

ALTER TABLE "exams"
ALTER COLUMN "slug" SET NOT NULL,
ALTER COLUMN "official_website" DROP NOT NULL,
ALTER COLUMN "application_open_date" SET DEFAULT '',
ALTER COLUMN "application_deadline" SET DEFAULT '',
ALTER COLUMN "admit_card_date" SET DEFAULT '',
ALTER COLUMN "exam_date" SET DEFAULT '',
ALTER COLUMN "status" SET DEFAULT 'tbd';

CREATE UNIQUE INDEX "exams_slug_key" ON "exams"("slug");
CREATE INDEX "exams_category_level_state_idx" ON "exams"("category", "level", "state");
CREATE INDEX "exams_registration_end_date_idx" ON "exams"("registration_end_date");
