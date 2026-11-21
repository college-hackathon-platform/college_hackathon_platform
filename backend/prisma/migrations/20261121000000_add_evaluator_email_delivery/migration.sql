CREATE TYPE "EventEvaluatorEmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "EventEvaluatorInvitation"
ADD COLUMN "designation" VARCHAR(255) NOT NULL DEFAULT 'Evaluator',
ADD COLUMN "organization" VARCHAR(255),
ADD COLUMN "phone" VARCHAR(40),
ADD COLUMN "invitationMessage" TEXT,
ADD COLUMN "emailDeliveryStatus" "EventEvaluatorEmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "emailDeliveryError" VARCHAR(500),
ADD COLUMN "emailedAt" TIMESTAMP(3);
