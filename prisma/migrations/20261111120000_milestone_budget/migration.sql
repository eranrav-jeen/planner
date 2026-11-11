-- Optional per-milestone budget (in the project's currency).
ALTER TABLE "milestones" ADD COLUMN "budget" DECIMAL(14,2);
