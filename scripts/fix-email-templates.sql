-- =====================================================
-- CLICKVEED PRODUCTION FIX - Run this on PostgreSQL
-- Fixes: Missing email templates
-- =====================================================

-- 1. Insert all required email templates
INSERT INTO "EmailTemplate" (key, subject, body) VALUES
('emailVerification', 'Verify Your Email Address', 'Hello {{name}},

Please verify your email address by clicking the link below:

{{verificationLink}}

This link will expire in 24 hours.

Thanks,
{{appName}} Team')
ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body;

INSERT INTO "EmailTemplate" (key, subject, body) VALUES
('userSignup', 'Welcome to {{appName}}!', 'Hello {{name}},

Welcome to {{appName}}! Your account has been created successfully.

Thanks for joining us!')
ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body;

INSERT INTO "EmailTemplate" (key, subject, body) VALUES
('passwordReset', 'Reset Your Password', 'Hello {{name}},

You requested a password reset. Click the link below to reset your password:

{{resetLink}}

This link will expire in 1 hour.

If you did not request this, please ignore this email.')
ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body;

INSERT INTO "EmailTemplate" (key, subject, body) VALUES
('adminNewUser', 'New User Signup', 'A new user has signed up:

Email: {{userEmail}}
Name: {{userName}}')
ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body;

INSERT INTO "EmailTemplate" (key, subject, body) VALUES
('subscriptionActivated', 'Subscription Activated', 'Hello {{name}},

Thank you for subscribing to {{planName}}!

Your subscription is now active.')
ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body;

INSERT INTO "EmailTemplate" (key, subject, body) VALUES
('subscriptionCanceled', 'Subscription Canceled', 'Hello {{name}},

Your {{planName}} subscription has been canceled.

We are sorry to see you go!')
ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body;

INSERT INTO "EmailTemplate" (key, subject, body) VALUES
('subscriptionRenewal', 'Subscription Renewal Reminder', 'Hello {{name}},

Your {{planName}} subscription will renew on {{renewalDate}}.')
ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body;

INSERT INTO "EmailTemplate" (key, subject, body) VALUES
('accountApproved', 'Your Account Has Been Approved', 'Hello {{name}},

Great news! Your account has been approved. You can now log in and access all features.

{{loginLink}}

Welcome to {{appName}}!')
ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body;

INSERT INTO "EmailTemplate" (key, subject, body) VALUES
('userInvitation', 'You have been invited!', 'Hello {{name}},

You have been invited to join our platform. Click on the link below to set up your account:

{{invitationLink}}')
ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body;

-- 2. Verify templates were inserted
SELECT key, subject FROM "EmailTemplate" ORDER BY key;

-- 3. Clean up any expired verification tokens
DELETE FROM "VerificationToken" WHERE expires < NOW();

-- 4. Show summary
SELECT 'Email templates inserted: ' || COUNT(*)::text as result FROM "EmailTemplate";
