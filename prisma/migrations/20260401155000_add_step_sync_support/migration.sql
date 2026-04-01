ALTER TABLE "User"
  ADD COLUMN "stepSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stepSyncProvider" TEXT,
  ADD COLUMN "stepSyncTokenHash" TEXT,
  ADD COLUMN "stepSyncTokenLast4" TEXT,
  ADD COLUMN "stepSyncLastSyncedAt" TIMESTAMP(3);

ALTER TABLE "Day"
  ADD COLUMN "stepsSource" TEXT,
  ADD COLUMN "stepsSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_stepSyncTokenHash_key" ON "User"("stepSyncTokenHash");

