CREATE TYPE "PlatformStatus" AS ENUM ('ONLINE', 'DEGRADED', 'MAINTENANCE');

CREATE TABLE "PlatformSettings" (
    "id" VARCHAR(36) NOT NULL DEFAULT 'default',
    "platformName" VARCHAR(180) NOT NULL DEFAULT 'College Hackathon Platform',
    "platformDescription" VARCHAR(1000) NOT NULL DEFAULT '',
    "supportEmail" VARCHAR(255) NOT NULL DEFAULT '',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "platformStatus" "PlatformStatus" NOT NULL DEFAULT 'ONLINE',
    "allowEventCreation" BOOLEAN NOT NULL DEFAULT true,
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" VARCHAR(1000) NOT NULL DEFAULT 'The platform is temporarily undergoing maintenance. Please try again later.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformSettings" (
    "id",
    "platformName",
    "platformDescription",
    "supportEmail",
    "timezone",
    "platformStatus",
    "allowEventCreation",
    "registrationEnabled",
    "maintenanceMode",
    "maintenanceMessage",
    "createdAt",
    "updatedAt"
) VALUES (
    'default',
    'College Hackathon Platform',
    '',
    '',
    'UTC',
    'ONLINE',
    true,
    true,
    false,
    'The platform is temporarily undergoing maintenance. Please try again later.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
