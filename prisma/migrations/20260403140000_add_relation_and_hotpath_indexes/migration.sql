-- Relation-field indexes required when relationMode = "prisma"
CREATE INDEX "User_planId_idx" ON "User"("planId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "PlanFeature_planId_idx" ON "PlanFeature"("planId");
CREATE INDEX "PromotionOnPlan_promotionId_idx" ON "PromotionOnPlan"("promotionId");
CREATE INDEX "ApplicablePromotionPlan_promotionId_idx" ON "ApplicablePromotionPlan"("promotionId");
CREATE INDEX "Video_projectId_idx" ON "Video"("projectId");

-- Hot-path composite indexes based on current query patterns
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_stripeSubscriptionStatus_stripeCurrentPeriodEnd_idx"
ON "User"("stripeSubscriptionStatus", "stripeCurrentPeriodEnd");
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt");
CREATE INDEX "MediaAsset_userId_createdAt_idx" ON "MediaAsset"("userId", "createdAt");
CREATE INDEX "Agent_userId_createdAt_idx" ON "Agent"("userId", "createdAt");
CREATE INDEX "SocialConnection_userId_createdAt_idx" ON "SocialConnection"("userId", "createdAt");
CREATE INDEX "VoiceClone_userId_createdAt_idx" ON "VoiceClone"("userId", "createdAt");
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
