-- CreateTable
CREATE TABLE "AiAssistantConversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAssistantConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAssistantConversation_userId_updatedAt_idx"
ON "AiAssistantConversation"("userId", "updatedAt");
