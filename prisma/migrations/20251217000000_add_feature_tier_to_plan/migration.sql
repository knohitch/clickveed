-- AlterTable: Add featureTier column to Plan table
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "featureTier" TEXT NOT NULL DEFAULT 'free';

-- Update existing plans with appropriate feature tiers based on their names
UPDATE "Plan" SET "featureTier" = 'free' WHERE LOWER(name) LIKE '%free%';
UPDATE "Plan" SET "featureTier" = 'starter' WHERE LOWER(name) LIKE '%starter%' OR LOWER(name) LIKE '%basic%';
UPDATE "Plan" SET "featureTier" = 'professional' WHERE LOWER(name) LIKE '%pro%' OR LOWER(name) LIKE '%professional%';
UPDATE "Plan" SET "featureTier" = 'enterprise' WHERE LOWER(name) LIKE '%enterprise%' OR LOWER(name) LIKE '%ultimate%';
