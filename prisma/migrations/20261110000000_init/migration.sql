-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT,
    "institution" TEXT,
    "password_hash" TEXT NOT NULL,
    "otp_hash" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "otp_attempts_remaining" INTEGER,
    "last_otp_sent_at" TIMESTAMP(3),
    "password_reset_token_hash" TEXT,
    "password_reset_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" TEXT NOT NULL,
    "personal_full_name" TEXT NOT NULL,
    "personal_dob" TEXT NOT NULL DEFAULT '',
    "personal_gender" TEXT NOT NULL DEFAULT '',
    "personal_nationality" TEXT NOT NULL DEFAULT '',
    "personal_category" TEXT NOT NULL DEFAULT '',
    "personal_phone_number" TEXT NOT NULL DEFAULT '',
    "personal_alt_phone_number" TEXT,
    "address_street" TEXT NOT NULL DEFAULT '',
    "address_city" TEXT NOT NULL DEFAULT '',
    "address_state" TEXT NOT NULL DEFAULT '',
    "address_pincode" TEXT NOT NULL DEFAULT '',
    "address_country" TEXT NOT NULL DEFAULT '',
    "fathers_name" TEXT,
    "mothers_name" TEXT,
    "class10_board" TEXT NOT NULL DEFAULT '',
    "class10_school_name" TEXT NOT NULL DEFAULT '',
    "class10_passing_year" INTEGER NOT NULL DEFAULT 0,
    "class10_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "class10_roll_number" TEXT NOT NULL DEFAULT '',
    "class10_max_marks" DOUBLE PRECISION,
    "class10_obtained_marks" DOUBLE PRECISION,
    "class12_status" TEXT NOT NULL DEFAULT '',
    "class12_board" TEXT NOT NULL DEFAULT '',
    "class12_school_name" TEXT NOT NULL DEFAULT '',
    "class12_passing_year" INTEGER NOT NULL DEFAULT 0,
    "class12_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "class12_roll_number" TEXT NOT NULL DEFAULT '',
    "class12_stream" TEXT NOT NULL DEFAULT '',
    "class12_subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "current_qualification" TEXT NOT NULL DEFAULT '',
    "academic_institution" TEXT NOT NULL DEFAULT '',
    "cgpa_or_percentage" DOUBLE PRECISION,
    "year_of_graduation" INTEGER,
    "preferred_exam_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "required_for" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL,
    "file_url" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "file_size" TEXT,
    "uploaded_at" TIMESTAMP(3),
    "extracted_data" JSONB,
    "detailed_extraction" JSONB,
    "confidence_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eligibility_summary" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "application_open_date" TEXT NOT NULL,
    "application_deadline" TEXT NOT NULL,
    "admit_card_date" TEXT NOT NULL,
    "exam_date" TEXT NOT NULL,
    "fee_inr" JSONB NOT NULL,
    "official_website" TEXT NOT NULL,
    "popular_courses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents_required" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL,
    "source_url" TEXT,
    "verified_at" TIMESTAMP(3),
    "application_fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "application_number" TEXT,
    "missing_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mapped_fields_count" INTEGER NOT NULL DEFAULT 0,
    "total_fields_count" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("token_hash")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "documents_user_id_uploaded_at_idx" ON "documents"("user_id", "uploaded_at");

-- CreateIndex
CREATE UNIQUE INDEX "documents_user_id_type_key" ON "documents"("user_id", "type");

-- CreateIndex
CREATE INDEX "exams_verified_at_application_deadline_idx" ON "exams"("verified_at", "application_deadline");

-- CreateIndex
CREATE INDEX "applications_user_id_status_idx" ON "applications"("user_id", "status");

-- CreateIndex
CREATE INDEX "applications_exam_id_idx" ON "applications"("exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_user_id_exam_id_key" ON "applications"("user_id", "exam_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
