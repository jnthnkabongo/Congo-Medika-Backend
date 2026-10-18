-- CreateEnum
CREATE TYPE "auth_code_user_type" AS ENUM ('patient', 'doctor');

-- CreateEnum
CREATE TYPE "auth_code_purpose" AS ENUM ('EMAIL_VERIFICATION', 'LOGIN_2FA');

-- CreateTable
CREATE TABLE "auth_codes" (
    "id" BIGSERIAL NOT NULL,
    "challenge_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "user_type" "auth_code_user_type" NOT NULL,
    "user_id" BIGINT NOT NULL,
    "purpose" "auth_code_purpose" NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(0) NOT NULL,
    "last_sent_at" TIMESTAMP(0) NOT NULL,
    "consumed_at" TIMESTAMP(0),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_auth_codes_challenge_id" ON "auth_codes"("challenge_id");

-- CreateIndex
CREATE INDEX "idx_auth_codes_email_type_purpose" ON "auth_codes"("email", "user_type", "purpose");

-- CreateIndex
CREATE INDEX "idx_auth_codes_expires_at" ON "auth_codes"("expires_at");
