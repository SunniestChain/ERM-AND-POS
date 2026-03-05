-- Migration: Add OTP columns to app_users
-- Run this in Supabase SQL Editor BEFORE deploying the new auth code

-- Add OTP columns
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;

-- Ensure is_verified column exists (set existing users as verified)
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true;

-- Hash existing plaintext passwords using pgcrypto
-- First, enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update all plaintext passwords to bcrypt hashes
-- This detects plaintext passwords (bcrypt hashes start with '$2')
UPDATE public.app_users
SET password = crypt(password, gen_salt('bf', 12))
WHERE password NOT LIKE '$2%';

-- Verify: check that all passwords are now hashed
-- SELECT id, username, LEFT(password, 4) as pw_prefix FROM app_users;
-- All should show '$2b$' or '$2a$'
