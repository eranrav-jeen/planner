-- Anchor milestones to explicit start/end dates instead of a sequential duration.
ALTER TABLE "milestones" ADD COLUMN "start_date" DATE;
ALTER TABLE "milestones" ADD COLUMN "end_date" DATE;

-- Backfill any pre-existing rows so the NOT NULL constraints can be applied.
UPDATE "milestones" SET "start_date" = CURRENT_DATE WHERE "start_date" IS NULL;
UPDATE "milestones" SET "end_date" = CURRENT_DATE WHERE "end_date" IS NULL;

ALTER TABLE "milestones" ALTER COLUMN "start_date" SET NOT NULL;
ALTER TABLE "milestones" ALTER COLUMN "end_date" SET NOT NULL;

ALTER TABLE "milestones" DROP COLUMN "duration_weeks";
