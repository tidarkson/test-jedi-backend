-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('JIRA', 'GITHUB', 'GITLAB', 'SLACK', 'TEAMS', 'CI');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('RUN_CREATED', 'RUN_CLOSED', 'CASE_FAILED', 'PLAN_APPROVED', 'DEFECT_CREATED');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "RunCase" ADD COLUMN "externalId" TEXT;

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" "WebhookEvent"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" "WebhookEvent" NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "requestBody" JSONB NOT NULL,
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "error" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "channel" TEXT NOT NULL,
    "enabledEvents" "WebhookEvent"[],
    "failureThreshold" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunPullRequestLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "repository" TEXT NOT NULL,
    "pullRequest" INTEGER NOT NULL,
    "branch" TEXT,
    "buildNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunPullRequestLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationImport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "matchedBy" TEXT NOT NULL,
    "totalResults" INTEGER NOT NULL,
    "matchedCases" INTEGER NOT NULL,
    "unmatched" JSONB,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_projectId_provider_key" ON "IntegrationConnection"("projectId", "provider");

-- CreateIndex
CREATE INDEX "IntegrationConnection_projectId_idx" ON "IntegrationConnection"("projectId");

-- CreateIndex
CREATE INDEX "IntegrationConnection_provider_idx" ON "IntegrationConnection"("provider");

-- CreateIndex
CREATE INDEX "Webhook_projectId_idx" ON "Webhook"("projectId");

-- CreateIndex
CREATE INDEX "Webhook_isActive_idx" ON "Webhook"("isActive");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");

-- CreateIndex
CREATE INDEX "NotificationRule_projectId_idx" ON "NotificationRule"("projectId");

-- CreateIndex
CREATE INDEX "NotificationRule_provider_idx" ON "NotificationRule"("provider");

-- CreateIndex
CREATE INDEX "NotificationRule_isActive_idx" ON "NotificationRule"("isActive");

-- CreateIndex
CREATE INDEX "RunPullRequestLink_projectId_idx" ON "RunPullRequestLink"("projectId");

-- CreateIndex
CREATE INDEX "RunPullRequestLink_runId_idx" ON "RunPullRequestLink"("runId");

-- CreateIndex
CREATE INDEX "RunPullRequestLink_provider_idx" ON "RunPullRequestLink"("provider");

-- CreateIndex
CREATE INDEX "RunPullRequestLink_buildNumber_idx" ON "RunPullRequestLink"("buildNumber");

-- CreateIndex
CREATE INDEX "RunPullRequestLink_branch_idx" ON "RunPullRequestLink"("branch");

-- CreateIndex
CREATE INDEX "AutomationImport_projectId_idx" ON "AutomationImport"("projectId");

-- CreateIndex
CREATE INDEX "AutomationImport_runId_idx" ON "AutomationImport"("runId");

-- CreateIndex
CREATE INDEX "AutomationImport_createdAt_idx" ON "AutomationImport"("createdAt");

-- CreateIndex
CREATE INDEX "RunCase_externalId_idx" ON "RunCase"("externalId");

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRule" ADD CONSTRAINT "NotificationRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunPullRequestLink" ADD CONSTRAINT "RunPullRequestLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunPullRequestLink" ADD CONSTRAINT "RunPullRequestLink_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationImport" ADD CONSTRAINT "AutomationImport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationImport" ADD CONSTRAINT "AutomationImport_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
