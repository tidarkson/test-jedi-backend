-- CreateTable "PendingInvitation"
CREATE TABLE "PendingInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviterUserId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable "CustomField"
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fieldType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable "CustomFieldValue"
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable "RetentionPolicy"
CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "filterCriteria" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingInvitation_token_key" ON "PendingInvitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PendingInvitation_organizationId_email_key" ON "PendingInvitation"("organizationId", "email");

-- CreateIndex
CREATE INDEX "PendingInvitation_organizationId_idx" ON "PendingInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "PendingInvitation_email_idx" ON "PendingInvitation"("email");

-- CreateIndex
CREATE INDEX "PendingInvitation_token_idx" ON "PendingInvitation"("token");

-- CreateIndex
CREATE INDEX "PendingInvitation_expiresAt_idx" ON "PendingInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "PendingInvitation_status_idx" ON "PendingInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_organizationId_name_key" ON "CustomField"("organizationId", "name");

-- CreateIndex
CREATE INDEX "CustomField_organizationId_idx" ON "CustomField"("organizationId");

-- CreateIndex
CREATE INDEX "CustomField_fieldType_idx" ON "CustomField"("fieldType");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_fieldId_entityId_entityType_key" ON "CustomFieldValue"("fieldId", "entityId", "entityType");

-- CreateIndex
CREATE INDEX "CustomFieldValue_fieldId_idx" ON "CustomFieldValue"("fieldId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_entityId_idx" ON "CustomFieldValue"("entityId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_entityType_idx" ON "CustomFieldValue"("entityType");

-- CreateIndex
CREATE INDEX "RetentionPolicy_organizationId_idx" ON "RetentionPolicy"("organizationId");

-- CreateIndex
CREATE INDEX "RetentionPolicy_entityType_idx" ON "RetentionPolicy"("entityType");

-- CreateIndex
CREATE INDEX "RetentionPolicy_isActive_idx" ON "RetentionPolicy"("isActive");

-- AddForeignKey
ALTER TABLE "PendingInvitation" ADD CONSTRAINT "PendingInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingInvitation" ADD CONSTRAINT "PendingInvitation_inviterUserId_fkey" FOREIGN KEY ("inviterUserId") REFERENCES "User"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionPolicy" ADD CONSTRAINT "RetentionPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create immutable audit log trigger
-- This trigger prevents updates and deletes on AuditLog table
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable_trigger
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();
