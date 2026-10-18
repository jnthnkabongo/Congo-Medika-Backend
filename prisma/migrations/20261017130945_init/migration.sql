-- CreateEnum
CREATE TYPE "patient_gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('active', 'blocked', 'pending');

-- CreateEnum
CREATE TYPE "DoctorStatus" AS ENUM ('active', 'inactive', 'pending', 'blocked');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "AppointmentPaymentStatus" AS ENUM ('unpaid', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('mpesa', 'airtel_money', 'orange_money', 'card');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'successful', 'failed', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "TeleconsultationStatus" AS ENUM ('waiting', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('patient', 'doctor');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'audio');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('audio', 'video');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('calling', 'accepted', 'rejected', 'missed', 'active', 'completed', 'failed');

-- CreateTable
CREATE TABLE "specialties" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" BIGSERIAL NOT NULL,
    "uuid" CHAR(36) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "date_of_birth" DATE,
    "gender" "patient_gender",
    "address" TEXT,
    "avatar" VARCHAR(500),
    "status" "PatientStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" BIGSERIAL NOT NULL,
    "uuid" CHAR(36) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "specialty_id" BIGINT NOT NULL,
    "license_number" VARCHAR(100) NOT NULL,
    "bio" TEXT,
    "consultation_fee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "avatar" VARCHAR(500),
    "status" "DoctorStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" BIGSERIAL NOT NULL,
    "uuid" CHAR(36) NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "appointment_date" DATE NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "reason" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'pending',
    "payment_status" "AppointmentPaymentStatus" NOT NULL DEFAULT 'unpaid',
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" BIGSERIAL NOT NULL,
    "uuid" CHAR(36) NOT NULL,
    "appointment_id" BIGINT NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "method" "PaymentMethod" NOT NULL,
    "provider" VARCHAR(100),
    "transaction_reference" VARCHAR(150),
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teleconsultations" (
    "id" BIGSERIAL NOT NULL,
    "uuid" CHAR(36) NOT NULL,
    "appointment_id" BIGINT NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "room_id" VARCHAR(150) NOT NULL,
    "status" "TeleconsultationStatus" NOT NULL DEFAULT 'waiting',
    "started_at" TIMESTAMP(0),
    "ended_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teleconsultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" BIGSERIAL NOT NULL,
    "uuid" CHAR(36) NOT NULL,
    "teleconsultation_id" BIGINT NOT NULL,
    "sender_type" "SenderType" NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "type" "MessageType" NOT NULL,
    "content" TEXT,
    "audio_url" VARCHAR(500),
    "audio_duration" INTEGER,
    "read_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" BIGSERIAL NOT NULL,
    "uuid" CHAR(36) NOT NULL,
    "teleconsultation_id" BIGINT NOT NULL,
    "caller_type" "SenderType" NOT NULL,
    "caller_id" BIGINT NOT NULL,
    "receiver_type" "SenderType" NOT NULL,
    "receiver_id" BIGINT NOT NULL,
    "type" "CallType" NOT NULL,
    "room_id" VARCHAR(150) NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'calling',
    "started_at" TIMESTAMP(0),
    "ended_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_specialties_name" ON "specialties"("name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_patients_uuid" ON "patients"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "uq_patients_email" ON "patients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_patients_phone" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "idx_patients_status" ON "patients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_doctors_uuid" ON "doctors"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "uq_doctors_email" ON "doctors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_doctors_phone" ON "doctors"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "uq_doctors_license_number" ON "doctors"("license_number");

-- CreateIndex
CREATE INDEX "idx_doctors_specialty" ON "doctors"("specialty_id");

-- CreateIndex
CREATE INDEX "idx_doctors_status" ON "doctors"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_appointments_uuid" ON "appointments"("uuid");

-- CreateIndex
CREATE INDEX "idx_appointments_patient" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "idx_appointments_doctor" ON "appointments"("doctor_id");

-- CreateIndex
CREATE INDEX "idx_appointments_date" ON "appointments"("appointment_date");

-- CreateIndex
CREATE INDEX "idx_appointments_status" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "idx_appointments_payment_status" ON "appointments"("payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_payments_uuid" ON "payments"("uuid");

-- CreateIndex
CREATE INDEX "idx_payments_appointment" ON "payments"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_payments_patient" ON "payments"("patient_id");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE INDEX "idx_payments_transaction_reference" ON "payments"("transaction_reference");

-- CreateIndex
CREATE UNIQUE INDEX "uq_teleconsultations_uuid" ON "teleconsultations"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "uq_teleconsultations_appointment" ON "teleconsultations"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_teleconsultations_room" ON "teleconsultations"("room_id");

-- CreateIndex
CREATE INDEX "idx_teleconsultations_patient" ON "teleconsultations"("patient_id");

-- CreateIndex
CREATE INDEX "idx_teleconsultations_doctor" ON "teleconsultations"("doctor_id");

-- CreateIndex
CREATE INDEX "idx_teleconsultations_status" ON "teleconsultations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_messages_uuid" ON "messages"("uuid");

-- CreateIndex
CREATE INDEX "idx_messages_teleconsultation" ON "messages"("teleconsultation_id");

-- CreateIndex
CREATE INDEX "idx_messages_sender" ON "messages"("sender_type", "sender_id");

-- CreateIndex
CREATE INDEX "idx_messages_created_at" ON "messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_calls_uuid" ON "calls"("uuid");

-- CreateIndex
CREATE INDEX "idx_calls_teleconsultation" ON "calls"("teleconsultation_id");

-- CreateIndex
CREATE INDEX "idx_calls_caller" ON "calls"("caller_type", "caller_id");

-- CreateIndex
CREATE INDEX "idx_calls_receiver" ON "calls"("receiver_type", "receiver_id");

-- CreateIndex
CREATE INDEX "idx_calls_status" ON "calls"("status");

-- CreateIndex
CREATE INDEX "idx_calls_room" ON "calls"("room_id");

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "fk_doctors_specialty" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teleconsultations" ADD CONSTRAINT "fk_teleconsultations_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teleconsultations" ADD CONSTRAINT "fk_teleconsultations_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teleconsultations" ADD CONSTRAINT "fk_teleconsultations_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_teleconsultation" FOREIGN KEY ("teleconsultation_id") REFERENCES "teleconsultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "fk_calls_teleconsultation" FOREIGN KEY ("teleconsultation_id") REFERENCES "teleconsultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
