-- AlterTable
ALTER TABLE "TestPlan" ADD COLUMN "description" TEXT,
ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "approvedById" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
DROP COLUMN "version";

-- AlterTable
ALTER TABLE "TestRun" ADD COLUMN "planRuns" TEXT;

-- AddForeignKey
ALTER TABLE "TestPlan" ADD CONSTRAINT "TestPlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "TestPlanRun" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestPlanRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "versionNum" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestPlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPlanBaseline" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestPlanBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestPlanRun_planId_runId_key" ON "TestPlanRun"("planId", "runId");

-- CreateIndex
CREATE INDEX "TestPlanRun_planId_idx" ON "TestPlanRun"("planId");

-- CreateIndex
CREATE INDEX "TestPlanRun_runId_idx" ON "TestPlanRun"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "TestPlanVersion_planId_versionNum_key" ON "TestPlanVersion"("planId", "versionNum");

-- CreateIndex
CREATE INDEX "TestPlanVersion_planId_idx" ON "TestPlanVersion"("planId");

-- CreateIndex
CREATE INDEX "TestPlanVersion_isBaseline_idx" ON "TestPlanVersion"("isBaseline");

-- CreateIndex
CREATE UNIQUE INDEX "TestPlanBaseline_planId_key" ON "TestPlanBaseline"("planId");

-- CreateIndex
CREATE INDEX "TestPlanBaseline_planId_idx" ON "TestPlanBaseline"("planId");

-- AddForeignKey
ALTER TABLE "TestPlanRun" ADD CONSTRAINT "TestPlanRun_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TestPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPlanRun" ADD CONSTRAINT "TestPlanRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPlanVersion" ADD CONSTRAINT "TestPlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TestPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPlanBaseline" ADD CONSTRAINT "TestPlanBaseline_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TestPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
