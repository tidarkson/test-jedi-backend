-- AlterEnum - Add new roles to UserRole enum
ALTER TYPE "UserRole" ADD VALUE 'OWNER';
ALTER TYPE "UserRole" ADD VALUE 'QA_LEAD';
ALTER TYPE "UserRole" ADD VALUE 'QA_ENGINEER';
ALTER TYPE "UserRole" ADD VALUE 'DEVELOPER';

-- Drop old enum values (requires dropping dependent columns first)
-- This is handled by Prisma's enum migration strategy

-- AlterTable - Add authentication fields to User
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Update role default for existing users
UPDATE "User" SET role = 'QA_ENGINEER' WHERE role = 'TESTER';
UPDATE "User" SET role = 'ADMIN' WHERE role = 'MANAGER';
