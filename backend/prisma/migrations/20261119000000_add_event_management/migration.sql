CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "EventMode" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "shortDescription" VARCHAR(300) NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "mode" "EventMode" NOT NULL DEFAULT 'ONLINE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "registrationStartDate" TIMESTAMP(3),
    "registrationEndDate" TIMESTAMP(3),
    "venue" VARCHAR(255),
    "registrationCapacity" INTEGER,
    "minTeamSize" INTEGER NOT NULL DEFAULT 1,
    "maxTeamSize" INTEGER NOT NULL DEFAULT 1,
    "eligibility" VARCHAR(1000),
    "rules" TEXT,
    "createdById" UUID NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE INDEX "Event_status_idx" ON "Event"("status");
CREATE INDEX "Event_mode_idx" ON "Event"("mode");
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");
CREATE INDEX "Event_status_mode_startDate_idx" ON "Event"("status", "mode", "startDate");

ALTER TABLE "Event"
ADD CONSTRAINT "Event_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
