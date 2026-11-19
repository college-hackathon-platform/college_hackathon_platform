CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DISBANDED');
CREATE TYPE "TeamMemberRole" AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE "TeamMemberStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED');
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'WAITLISTED');

CREATE TABLE "Team" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" TEXT,
  "inviteCodeHash" VARCHAR(255),
  "inviteExpiresAt" TIMESTAMP(3),
  "inviteRevokedAt" TIMESTAMP(3),
  "eventId" UUID NOT NULL,
  "leaderId" UUID NOT NULL,
  "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamMember" (
  "id" UUID NOT NULL,
  "teamId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" "TeamMemberRole" NOT NULL,
  "status" "TeamMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3),
  "leftAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventRegistration" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "teamId" UUID NOT NULL,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
  "registeredAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" UUID,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegistrationStatusHistory" (
  "id" UUID NOT NULL,
  "registrationId" UUID NOT NULL,
  "fromStatus" "RegistrationStatus" NOT NULL,
  "toStatus" "RegistrationStatus" NOT NULL,
  "changedById" UUID NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Team_eventId_name_key" ON "Team"("eventId", "name");
CREATE INDEX "Team_eventId_idx" ON "Team"("eventId");
CREATE INDEX "Team_leaderId_idx" ON "Team"("leaderId");
CREATE INDEX "Team_status_idx" ON "Team"("status");
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId","userId");
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");
CREATE INDEX "TeamMember_userId_status_idx" ON "TeamMember"("userId","status");
CREATE UNIQUE INDEX "EventRegistration_eventId_teamId_key" ON "EventRegistration"("eventId","teamId");
CREATE INDEX "EventRegistration_eventId_idx" ON "EventRegistration"("eventId");
CREATE INDEX "EventRegistration_teamId_idx" ON "EventRegistration"("teamId");
CREATE INDEX "EventRegistration_status_idx" ON "EventRegistration"("status");
CREATE INDEX "EventRegistration_eventId_status_idx" ON "EventRegistration"("eventId","status");
CREATE INDEX "RegistrationStatusHistory_registrationId_idx" ON "RegistrationStatusHistory"("registrationId");
CREATE INDEX "RegistrationStatusHistory_createdAt_idx" ON "RegistrationStatusHistory"("createdAt");

ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistrationStatusHistory" ADD CONSTRAINT "RegistrationStatusHistory_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistrationStatusHistory" ADD CONSTRAINT "RegistrationStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
