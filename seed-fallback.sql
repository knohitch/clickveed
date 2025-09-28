-- Fallback seed script to create essential data if TypeScript seeding fails

-- Insert Free plan if it doesn't exist
INSERT INTO "Plan" (id, name, description, "priceMonthly", "priceQuarterly", "priceYearly", "videoExports", "aiCredits", "storageGB", "createdAt", "updatedAt")
SELECT 'plan_free', 'Free', 'For users getting started. Access basic features and a limited amount of resources.', 0, 0, 0, 5, 1000, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Plan" WHERE id = 'plan_free');

-- Insert plan features for Free plan
INSERT INTO "PlanFeature" (id, text, "planId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, '5 Video Exports / mo', 'plan_free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PlanFeature" WHERE "planId" = 'plan_free' AND text = '5 Video Exports / mo');

INSERT INTO "PlanFeature" (id, text, "planId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, '1,000 AI Credits', 'plan_free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PlanFeature" WHERE "planId" = 'plan_free' AND text = '1,000 AI Credits');

INSERT INTO "PlanFeature" (id, text, "planId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, '2 GB Storage', 'plan_free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PlanFeature" WHERE "planId" = 'plan_free' AND text = '2 GB Storage');

INSERT INTO "PlanFeature" (id, text, "planId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Standard Support', 'plan_free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PlanFeature" WHERE "planId" = 'plan_free' AND text = 'Standard Support');

-- Insert basic settings
INSERT INTO "Setting" (key, value, "createdAt", "updatedAt")
SELECT 'appName', 'ClickVid Pro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Setting" WHERE key = 'appName');

INSERT INTO "Setting" (key, value, "createdAt", "updatedAt")
SELECT 'allowAdminSignup', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Setting" WHERE key = 'allowAdminSignup');
