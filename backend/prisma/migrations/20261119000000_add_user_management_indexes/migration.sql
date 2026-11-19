-- Add indexes that support role/status filtering and created-date sorting.
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_role_status_createdAt_idx" ON "User"("role", "status", "createdAt");
