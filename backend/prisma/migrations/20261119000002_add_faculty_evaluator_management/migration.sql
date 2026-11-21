CREATE TYPE "EventEvaluatorInvitationStatus" AS ENUM ('PENDING', 'REVOKED', 'EXPIRED');

CREATE TABLE "EventFacultyAssignment" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "facultyId" UUID NOT NULL,
  "assignedById" UUID NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventFacultyAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventEvaluatorInvitation" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "status" "EventEvaluatorInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventEvaluatorInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventFacultyAssignment_eventId_facultyId_key"
ON "EventFacultyAssignment"("eventId","facultyId");
CREATE INDEX "EventFacultyAssignment_eventId_idx" ON "EventFacultyAssignment"("eventId");
CREATE INDEX "EventFacultyAssignment_facultyId_idx" ON "EventFacultyAssignment"("facultyId");
CREATE INDEX "EventFacultyAssignment_assignedById_idx" ON "EventFacultyAssignment"("assignedById");

CREATE INDEX "EventEvaluatorInvitation_eventId_idx" ON "EventEvaluatorInvitation"("eventId");
CREATE INDEX "EventEvaluatorInvitation_email_idx" ON "EventEvaluatorInvitation"("email");
CREATE INDEX "EventEvaluatorInvitation_status_idx" ON "EventEvaluatorInvitation"("status");
CREATE INDEX "EventEvaluatorInvitation_expiresAt_idx" ON "EventEvaluatorInvitation"("expiresAt");
CREATE INDEX "EventEvaluatorInvitation_eventId_status_idx" ON "EventEvaluatorInvitation"("eventId","status");
CREATE UNIQUE INDEX "EventEvaluatorInvitation_active_event_email_key"
ON "EventEvaluatorInvitation"("eventId","email")
WHERE "status" = 'PENDING';

ALTER TABLE "EventFacultyAssignment"
ADD CONSTRAINT "EventFacultyAssignment_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "EventFacultyAssignment_facultyId_fkey"
FOREIGN KEY ("facultyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "EventFacultyAssignment_assignedById_fkey"
FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventEvaluatorInvitation"
ADD CONSTRAINT "EventEvaluatorInvitation_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "EventEvaluatorInvitation_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
