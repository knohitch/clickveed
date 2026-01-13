-- Fallback seed script to create essential data if TypeScript seeding fails

-- Insert all plans with ON CONFLICT handling
INSERT INTO "Plan" (id, name, description, "priceMonthly", "priceQuarterly", "priceYearly", "featureTier", "videoExports", "aiCredits", "storageGB", "createdAt", "updatedAt")
VALUES 
    ('plan_free', 'Free', 'For users getting started. Access basic features and a limited amount of resources.', 0, 0, 0, 'free', 5, 1000, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('plan_creator', 'Creator', 'Perfect for individual creators and small businesses getting started with AI video.', 49, 129, 499, 'starter', 15, 15000, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('plan_pro', 'Pro', 'For serious creators and businesses scaling their content production.', 99, 269, 999, 'professional', NULL, 50000, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('plan_agency', 'Agency', 'For large agencies needing collaboration and advanced features.', 249, 679, 2499, 'enterprise', NULL, NULL, 500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    "priceMonthly" = EXCLUDED."priceMonthly",
    "priceQuarterly" = EXCLUDED."priceQuarterly",
    "priceYearly" = EXCLUDED."priceYearly",
    "featureTier" = EXCLUDED."featureTier",
    "videoExports" = EXCLUDED."videoExports",
    "aiCredits" = EXCLUDED."aiCredits",
    "storageGB" = EXCLUDED."storageGB",
    "updatedAt" = CURRENT_TIMESTAMP;

-- Delete old features for all plans to avoid duplicates
DELETE FROM "PlanFeature" WHERE "planId" IN ('plan_free', 'plan_creator', 'plan_pro', 'plan_agency');

-- Insert plan features for Free plan
INSERT INTO "PlanFeature" (id, text, "planId")
VALUES 
    (gen_random_uuid()::text, '5 Video Exports / mo', 'plan_free'),
    (gen_random_uuid()::text, '1,000 AI Credits', 'plan_free'),
    (gen_random_uuid()::text, '2 GB Storage', 'plan_free'),
    (gen_random_uuid()::text, 'Standard Support', 'plan_free');

-- Insert plan features for Creator plan
INSERT INTO "PlanFeature" (id, text, "planId")
VALUES 
    (gen_random_uuid()::text, '15 Video Exports / mo', 'plan_creator'),
    (gen_random_uuid()::text, '15,000 AI Credits', 'plan_creator'),
    (gen_random_uuid()::text, '20 GB Storage', 'plan_creator'),
    (gen_random_uuid()::text, 'AI Script & Image Generation', 'plan_creator'),
    (gen_random_uuid()::text, 'Standard AI Voices', 'plan_creator'),
    (gen_random_uuid()::text, 'Social Scheduler', 'plan_creator'),
    (gen_random_uuid()::text, 'Standard Support', 'plan_creator');

-- Insert plan features for Pro plan
INSERT INTO "PlanFeature" (id, text, "planId")
VALUES 
    (gen_random_uuid()::text, 'Unlimited Video Exports', 'plan_pro'),
    (gen_random_uuid()::text, '50,000 AI Credits', 'plan_pro'),
    (gen_random_uuid()::text, '100 GB Storage', 'plan_pro'),
    (gen_random_uuid()::text, 'AI Voice Cloning', 'plan_pro'),
    (gen_random_uuid()::text, 'Magic Clips Generator', 'plan_pro'),
    (gen_random_uuid()::text, 'Advanced Analytics', 'plan_pro'),
    (gen_random_uuid()::text, 'Priority Support', 'plan_pro');

-- Insert plan features for Agency plan
INSERT INTO "PlanFeature" (id, text, "planId")
VALUES 
    (gen_random_uuid()::text, 'All Pro Features', 'plan_agency'),
    (gen_random_uuid()::text, 'Unlimited AI Credits', 'plan_agency'),
    (gen_random_uuid()::text, '500 GB Storage', 'plan_agency'),
    (gen_random_uuid()::text, 'Team Collaboration (5 Seats)', 'plan_agency'),
    (gen_random_uuid()::text, 'API Access & Integrations', 'plan_agency'),
    (gen_random_uuid()::text, 'Dedicated Account Manager', 'plan_agency');

-- Insert basic settings
INSERT INTO "Setting" (key, value)
SELECT 'appName', 'ClickVid Pro'
WHERE NOT EXISTS (SELECT 1 FROM "Setting" WHERE key = 'appName');

INSERT INTO "Setting" (key, value)
SELECT 'allowAdminSignup', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "Setting" WHERE key = 'allowAdminSignup');
