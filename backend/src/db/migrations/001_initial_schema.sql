-- ============================================================================
-- BloodBridge Vision-X Database Schema Migration
-- Migration: 001_initial_schema.sql
-- Description: Core tables, enums, RLS policies, and constraints
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('requester', 'donor', 'admin')),
    phone VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Blood Requests Table
CREATE TABLE IF NOT EXISTS blood_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_name VARCHAR(150) NOT NULL,
    blood_group VARCHAR(10) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units_needed INTEGER NOT NULL CHECK (units_needed > 0 AND units_needed <= 50),
    hospital_name VARCHAR(255) NOT NULL,
    hospital_address TEXT,
    city VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    urgency VARCHAR(30) NOT NULL DEFAULT 'urgent' CHECK (urgency IN ('emergency', 'urgent', 'scheduled')),
    needed_by TIMESTAMP WITH TIME ZONE,
    description TEXT,
    contact_phone VARCHAR(30),
    contact_preference VARCHAR(30) DEFAULT 'phone' CHECK (contact_preference IN ('phone', 'email', 'in_app')),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES blood_requests(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'system',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Integration Logs Table
CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('success', 'error', 'warning')),
    payload_summary JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_role VARCHAR(30),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON blood_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_blood_group ON blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_requests_status ON blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
