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
    (gen_random_uuid()::text, 'Standard Support', 'plan_free'),
    (gen_random_uuid()::text, 'AI Assistant', 'plan_free'),
    (gen_random_uuid()::text, 'Creative Assistant', 'plan_free'),
    (gen_random_uuid()::text, 'Social Integrations', 'plan_free'),
    (gen_random_uuid()::text, 'Media Library', 'plan_free'),
    (gen_random_uuid()::text, 'Profile Settings', 'plan_free');

-- Insert plan features for Creator plan
INSERT INTO "PlanFeature" (id, text, "planId")
VALUES 
    (gen_random_uuid()::text, '15 Video Exports / mo', 'plan_creator'),
    (gen_random_uuid()::text, '15,000 AI Credits', 'plan_creator'),
    (gen_random_uuid()::text, '20 GB Storage', 'plan_creator'),
    (gen_random_uuid()::text, 'Standard Support', 'plan_creator'),
    -- Free tier features
    (gen_random_uuid()::text, 'AI Assistant', 'plan_creator'),
    (gen_random_uuid()::text, 'Creative Assistant', 'plan_creator'),
    (gen_random_uuid()::text, 'Social Integrations', 'plan_creator'),
    (gen_random_uuid()::text, 'Media Library', 'plan_creator'),
    (gen_random_uuid()::text, 'Profile Settings', 'plan_creator'),
    -- Starter tier additional features
    (gen_random_uuid()::text, 'Topic Researcher', 'plan_creator'),
    (gen_random_uuid()::text, 'Video Suite', 'plan_creator'),
    (gen_random_uuid()::text, 'Video Pipeline', 'plan_creator'),
    (gen_random_uuid()::text, 'Video Editor', 'plan_creator'),
    (gen_random_uuid()::text, 'Script Generator', 'plan_creator'),
    (gen_random_uuid()::text, 'Video from URL', 'plan_creator'),
    (gen_random_uuid()::text, 'Stock Media Library', 'plan_creator'),
    (gen_random_uuid()::text, 'AI Image Generator', 'plan_creator'),
    (gen_random_uuid()::text, 'Background Remover', 'plan_creator'),
    (gen_random_uuid()::text, 'Social Analytics', 'plan_creator'),
    (gen_random_uuid()::text, 'Brand Kit', 'plan_creator'),
    (gen_random_uuid()::text, 'Standard AI Voices', 'plan_creator'),
    (gen_random_uuid()::text, 'Social Scheduler', 'plan_creator');

-- Insert plan features for Pro plan
INSERT INTO "PlanFeature" (id, text, "planId")
VALUES 
    (gen_random_uuid()::text, 'Unlimited Video Exports', 'plan_pro'),
    (gen_random_uuid()::text, '50,000 AI Credits', 'plan_pro'),
    (gen_random_uuid()::text, '100 GB Storage', 'plan_pro'),
    (gen_random_uuid()::text, 'Priority Support', 'plan_pro'),
    -- All Free and Starter tier features
    (gen_random_uuid()::text, 'AI Assistant', 'plan_pro'),
    (gen_random_uuid()::text, 'Creative Assistant', 'plan_pro'),
    (gen_random_uuid()::text, 'Social Integrations', 'plan_pro'),
    (gen_random_uuid()::text, 'Media Library', 'plan_pro'),
    (gen_random_uuid()::text, 'Profile Settings', 'plan_pro'),
    (gen_random_uuid()::text, 'Topic Researcher', 'plan_pro'),
    (gen_random_uuid()::text, 'Video Suite', 'plan_pro'),
    (gen_random_uuid()::text, 'Video Pipeline', 'plan_pro'),
    (gen_random_uuid()::text, 'Video Editor', 'plan_pro'),
    (gen_random_uuid()::text, 'Script Generator', 'plan_pro'),
    (gen_random_uuid()::text, 'Video from URL', 'plan_pro'),
    (gen_random_uuid()::text, 'Stock Media Library', 'plan_pro'),
    (gen_random_uuid()::text, 'AI Image Generator', 'plan_pro'),
    (gen_random_uuid()::text, 'Background Remover', 'plan_pro'),
    (gen_random_uuid()::text, 'Social Analytics', 'plan_pro'),
    (gen_random_uuid()::text, 'Brand Kit', 'plan_pro'),
    (gen_random_uuid()::text, 'Standard AI Voices', 'plan_pro'),
    (gen_random_uuid()::text, 'Social Scheduler', 'plan_pro'),
    -- Professional tier additional features
    (gen_random_uuid()::text, 'Thumbnail Tester', 'plan_pro'),
    (gen_random_uuid()::text, 'Magic Clips', 'plan_pro'),
    (gen_random_uuid()::text, 'Voice Over', 'plan_pro'),
    (gen_random_uuid()::text, 'Image to Video', 'plan_pro'),
    (gen_random_uuid()::text, 'Persona Avatar Studio', 'plan_pro'),
    (gen_random_uuid()::text, 'Flux Pro Editor', 'plan_pro'),
    (gen_random_uuid()::text, 'AI Agent Builder', 'plan_pro'),
    (gen_random_uuid()::text, 'AI Voice Cloning', 'plan_pro'),
    (gen_random_uuid()::text, 'Advanced Analytics', 'plan_pro');

-- Insert plan features for Agency plan
INSERT INTO "PlanFeature" (id, text, "planId")
VALUES 
    (gen_random_uuid()::text, 'Unlimited AI Credits', 'plan_agency'),
    (gen_random_uuid()::text, '500 GB Storage', 'plan_agency'),
    (gen_random_uuid()::text, 'Dedicated Account Manager', 'plan_agency'),
    -- All Pro features (explicitly listed for clarity)
    (gen_random_uuid()::text, 'AI Assistant', 'plan_agency'),
    (gen_random_uuid()::text, 'Creative Assistant', 'plan_agency'),
    (gen_random_uuid()::text, 'Social Integrations', 'plan_agency'),
    (gen_random_uuid()::text, 'Media Library', 'plan_agency'),
    (gen_random_uuid()::text, 'Profile Settings', 'plan_agency'),
    (gen_random_uuid()::text, 'Topic Researcher', 'plan_agency'),
    (gen_random_uuid()::text, 'Video Suite', 'plan_agency'),
    (gen_random_uuid()::text, 'Video Pipeline', 'plan_agency'),
    (gen_random_uuid()::text, 'Video Editor', 'plan_agency'),
    (gen_random_uuid()::text, 'Script Generator', 'plan_agency'),
    (gen_random_uuid()::text, 'Video from URL', 'plan_agency'),
    (gen_random_uuid()::text, 'Stock Media Library', 'plan_agency'),
    (gen_random_uuid()::text, 'AI Image Generator', 'plan_agency'),
    (gen_random_uuid()::text, 'Background Remover', 'plan_agency'),
    (gen_random_uuid()::text, 'Social Analytics', 'plan_agency'),
    (gen_random_uuid()::text, 'Brand Kit', 'plan_agency'),
    (gen_random_uuid()::text, 'Standard AI Voices', 'plan_agency'),
    (gen_random_uuid()::text, 'Social Scheduler', 'plan_agency'),
    (gen_random_uuid()::text, 'Thumbnail Tester', 'plan_agency'),
    (gen_random_uuid()::text, 'Magic Clips', 'plan_agency'),
    (gen_random_uuid()::text, 'Voice Over', 'plan_agency'),
    (gen_random_uuid()::text, 'Image to Video', 'plan_agency'),
    (gen_random_uuid()::text, 'Persona Avatar Studio', 'plan_agency'),
    (gen_random_uuid()::text, 'Flux Pro Editor', 'plan_agency'),
    (gen_random_uuid()::text, 'AI Agent Builder', 'plan_agency'),
    (gen_random_uuid()::text, 'AI Voice Cloning', 'plan_agency'),
    (gen_random_uuid()::text, 'Advanced Analytics', 'plan_agency'),
    -- Enterprise tier additional features
    (gen_random_uuid()::text, 'N8n/Make Integrations', 'plan_agency'),
    (gen_random_uuid()::text, 'Team Collaboration (5 Seats)', 'plan_agency'),
    (gen_random_uuid()::text, 'API Access & Integrations', 'plan_agency'),
    (gen_random_uuid()::text, 'Unlimited Video Exports', 'plan_agency'),
    (gen_random_uuid()::text, 'Priority Support', 'plan_agency');

-- Insert basic settings
INSERT INTO "Setting" (key, value)
SELECT 'appName', 'ClickVid Pro'
WHERE NOT EXISTS (SELECT 1 FROM "Setting" WHERE key = 'appName');

INSERT INTO "Setting" (key, value)
SELECT 'allowAdminSignup', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "Setting" WHERE key = 'allowAdminSignup');
