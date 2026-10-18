-- ============================================================
-- Base de données : plateforme de téléconsultation
-- SGBD : PostgreSQL 14+
-- ============================================================

DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS teleconsultations CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS specialties CASCADE;

DROP TYPE IF EXISTS patient_gender CASCADE;
DROP TYPE IF EXISTS patient_status CASCADE;
DROP TYPE IF EXISTS doctor_status CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS appointment_payment_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS teleconsultation_status CASCADE;
DROP TYPE IF EXISTS sender_type CASCADE;
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS call_type CASCADE;
DROP TYPE IF EXISTS call_status CASCADE;

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE patient_gender AS ENUM ('male', 'female', 'other');
CREATE TYPE patient_status AS ENUM ('active', 'blocked', 'pending');
CREATE TYPE doctor_status AS ENUM ('active', 'inactive', 'pending', 'blocked');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE appointment_payment_status AS ENUM ('unpaid', 'paid', 'refunded');
CREATE TYPE payment_method AS ENUM ('mpesa', 'airtel_money', 'orange_money', 'card');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'successful', 'failed', 'cancelled', 'refunded');
CREATE TYPE teleconsultation_status AS ENUM ('waiting', 'active', 'completed', 'cancelled');
CREATE TYPE sender_type AS ENUM ('patient', 'doctor');
CREATE TYPE message_type AS ENUM ('text', 'audio');
CREATE TYPE call_type AS ENUM ('audio', 'video');
CREATE TYPE call_status AS ENUM ('calling', 'accepted', 'rejected', 'missed', 'active', 'completed', 'failed');

-- ============================================================
-- 2. SPECIALTIES
-- ============================================================

CREATE TABLE specialties (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_specialties_name UNIQUE (name)
);

-- ============================================================
-- 3. PATIENTS
-- ============================================================

CREATE TABLE patients (
    id BIGSERIAL PRIMARY KEY,
    uuid CHAR(36) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    password VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender patient_gender,
    address TEXT,
    avatar VARCHAR(500),
    status patient_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_patients_uuid UNIQUE (uuid),
    CONSTRAINT uq_patients_email UNIQUE (email),
    CONSTRAINT uq_patients_phone UNIQUE (phone)
);

CREATE INDEX idx_patients_status ON patients(status);

-- ============================================================
-- 4. DOCTORS
-- ============================================================

CREATE TABLE doctors (
    id BIGSERIAL PRIMARY KEY,
    uuid CHAR(36) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    password VARCHAR(255) NOT NULL,
    specialty_id BIGINT NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    bio TEXT,
    consultation_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    avatar VARCHAR(500),
    status doctor_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_doctors_uuid UNIQUE (uuid),
    CONSTRAINT uq_doctors_email UNIQUE (email),
    CONSTRAINT uq_doctors_phone UNIQUE (phone),
    CONSTRAINT uq_doctors_license_number UNIQUE (license_number),
    CONSTRAINT fk_doctors_specialty
        FOREIGN KEY (specialty_id)
        REFERENCES specialties(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_doctors_specialty ON doctors(specialty_id);
CREATE INDEX idx_doctors_status ON doctors(status);

-- ============================================================
-- 5. APPOINTMENTS
-- ============================================================

CREATE TABLE appointments (
    id BIGSERIAL PRIMARY KEY,
    uuid CHAR(36) NOT NULL,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME(0) NOT NULL,
    end_time TIME(0) NOT NULL,
    reason TEXT,
    status appointment_status NOT NULL DEFAULT 'pending',
    payment_status appointment_payment_status NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_appointments_uuid UNIQUE (uuid),
    CONSTRAINT fk_appointments_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_appointments_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_payment_status ON appointments(payment_status);

-- ============================================================
-- 6. PAYMENTS
-- ============================================================

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    uuid CHAR(36) NOT NULL,
    appointment_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    method payment_method NOT NULL,
    provider VARCHAR(100),
    transaction_reference VARCHAR(150),
    status payment_status NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP(0),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_payments_uuid UNIQUE (uuid),
    CONSTRAINT fk_payments_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointments(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_payments_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_patient ON payments(patient_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction_reference ON payments(transaction_reference);

-- ============================================================
-- 7. TELECONSULTATIONS
-- ============================================================

CREATE TABLE teleconsultations (
    id BIGSERIAL PRIMARY KEY,
    uuid CHAR(36) NOT NULL,
    appointment_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    room_id VARCHAR(150) NOT NULL,
    status teleconsultation_status NOT NULL DEFAULT 'waiting',
    started_at TIMESTAMP(0),
    ended_at TIMESTAMP(0),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_teleconsultations_uuid UNIQUE (uuid),
    CONSTRAINT uq_teleconsultations_appointment UNIQUE (appointment_id),
    CONSTRAINT uq_teleconsultations_room UNIQUE (room_id),
    CONSTRAINT fk_teleconsultations_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointments(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_teleconsultations_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_teleconsultations_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_teleconsultations_patient ON teleconsultations(patient_id);
CREATE INDEX idx_teleconsultations_doctor ON teleconsultations(doctor_id);
CREATE INDEX idx_teleconsultations_status ON teleconsultations(status);

-- ============================================================
-- 8. MESSAGES
--    Uniquement : texte et audio
-- ============================================================

CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    uuid CHAR(36) NOT NULL,
    teleconsultation_id BIGINT NOT NULL,
    sender_type sender_type NOT NULL,
    sender_id BIGINT NOT NULL,
    type message_type NOT NULL,
    content TEXT,
    audio_url VARCHAR(500),
    audio_duration INTEGER,
    read_at TIMESTAMP(0),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_messages_uuid UNIQUE (uuid),
    CONSTRAINT fk_messages_teleconsultation
        FOREIGN KEY (teleconsultation_id)
        REFERENCES teleconsultations(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_messages_teleconsultation ON messages(teleconsultation_id);
CREATE INDEX idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ============================================================
-- 9. CALLS
--    Appels audio et vidéo
-- ============================================================

CREATE TABLE calls (
    id BIGSERIAL PRIMARY KEY,
    uuid CHAR(36) NOT NULL,
    teleconsultation_id BIGINT NOT NULL,
    caller_type sender_type NOT NULL,
    caller_id BIGINT NOT NULL,
    receiver_type sender_type NOT NULL,
    receiver_id BIGINT NOT NULL,
    type call_type NOT NULL,
    room_id VARCHAR(150) NOT NULL,
    status call_status NOT NULL DEFAULT 'calling',
    started_at TIMESTAMP(0),
    ended_at TIMESTAMP(0),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_calls_uuid UNIQUE (uuid),
    CONSTRAINT fk_calls_teleconsultation
        FOREIGN KEY (teleconsultation_id)
        REFERENCES teleconsultations(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_calls_teleconsultation ON calls(teleconsultation_id);
CREATE INDEX idx_calls_caller ON calls(caller_type, caller_id);
CREATE INDEX idx_calls_receiver ON calls(receiver_type, receiver_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_room ON calls(room_id);

-- ============================================================
-- DONNEES INITIALES : SPECIALITES
-- ============================================================

INSERT INTO specialties (name, description) VALUES
('Médecine générale', 'Consultations médicales générales'),
('Cardiologie', 'Diagnostic et suivi des maladies cardiovasculaires'),
('Pédiatrie', 'Médecine des enfants'),
('Gynécologie', 'Santé reproductive et gynécologie'),
('Dermatologie', 'Maladies de la peau'),
('Neurologie', 'Maladies du système nerveux'),
('ORL', 'Oto-rhino-laryngologie'),
('Ophtalmologie', 'Santé et maladies des yeux');

-- ============================================================
-- FIN
-- ============================================================
