CREATE TABLE "PersonaAvatarJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personaName" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "avatarImageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "videoUrl" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaAvatarJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonaAvatarJob_userId_createdAt_idx" ON "PersonaAvatarJob"("userId", "createdAt");
CREATE INDEX "PersonaAvatarJob_status_createdAt_idx" ON "PersonaAvatarJob"("status", "createdAt");
