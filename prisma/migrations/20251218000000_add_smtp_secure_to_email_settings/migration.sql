-- Add smtpSecure field to EmailSettings table
-- This field controls TLS/SSL connection security for SMTP
-- Values: 'auto' (default), 'tls' (STARTTLS), 'ssl' (SSL/TLS), 'none'

ALTER TABLE "EmailSettings" ADD COLUMN IF NOT EXISTS "smtpSecure" TEXT NOT NULL DEFAULT 'auto';
