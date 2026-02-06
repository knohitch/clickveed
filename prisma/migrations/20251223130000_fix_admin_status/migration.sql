-- Fix admin user status to prevent redirection loop
-- This migration sets all admin users (ADMIN and SUPER_ADMIN) to 'Active' status
-- This prevents the verify-pending redirect loop for admin accounts

UPDATE "User" 
SET status = 'Active' 
WHERE role IN ('ADMIN', 'SUPER_ADMIN') 
AND (status IS NULL OR status = 'Pending');

-- Add a comment to document why this is needed
-- Admin users should bypass email verification to prevent being locked out
-- If you want to require admin email verification, modify this accordingly
