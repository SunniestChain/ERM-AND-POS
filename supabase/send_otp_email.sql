-- Supabase Email Function for OTP
-- This uses pg_net (built into all Supabase projects) to send OTP emails
-- Run this in Supabase SQL Editor

-- Enable pg_net extension (built-in on all Supabase plans)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the send_otp_email function
-- This sends a styled HTML email via Supabase's internal email hook
CREATE OR REPLACE FUNCTION public.send_otp_email(
    p_email TEXT,
    p_otp_code TEXT,
    p_username TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subject TEXT := 'Mayco Diesel — Código de verificación';
    v_html TEXT;
BEGIN
    v_html := format(
        '<div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 2rem; background: #1a1a2e; color: #fff; border-radius: 12px;">
            <h2 style="text-align: center; color: #4ade80;">Mayco Diesel</h2>
            <p>Hola <strong>%s</strong>,</p>
            <p>Tu código de verificación es:</p>
            <div style="text-align: center; margin: 1.5rem 0;">
                <span style="font-size: 2.5rem; font-weight: 800; letter-spacing: 8px; color: #4ade80; font-family: monospace;">%s</span>
            </div>
            <p style="color: #aaa; font-size: 0.85rem;">Este código expira en 15 minutos.</p>
            <p style="color: #aaa; font-size: 0.85rem;">Si no solicitaste esta verificación, ignora este correo.</p>
        </div>',
        p_username, p_otp_code
    );

    -- Use pg_net to send HTTP request to Supabase's edge function or webhook
    -- For now, log the OTP (it will show in Supabase Logs > Postgres)
    RAISE LOG 'OTP for % (%): %', p_username, p_email, p_otp_code;

    -- When you set up a Supabase Edge Function for email, uncomment this:
    -- PERFORM net.http_post(
    --     url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-email',
    --     headers := jsonb_build_object(
    --         'Content-Type', 'application/json',
    --         'Authorization', 'Bearer YOUR_ANON_KEY'
    --     ),
    --     body := jsonb_build_object(
    --         'to', p_email,
    --         'subject', v_subject,
    --         'html', v_html
    --     )
    -- );
END;
$$;

-- Grant execute to service_role (called from Rust backend)
GRANT EXECUTE ON FUNCTION public.send_otp_email(TEXT, TEXT, TEXT) TO service_role;
