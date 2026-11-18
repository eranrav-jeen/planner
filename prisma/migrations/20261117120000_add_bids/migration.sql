-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('evaluating', 'applying', 'submitted', 'won', 'lost', 'no_bid');

-- CreateEnum
CREATE TYPE "BidStageStatus" AS ENUM ('pending', 'done', 'skipped');

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "description" TEXT,
    "status" "BidStatus" NOT NULL DEFAULT 'evaluating',
    "submission_date" DATE,
    "win_probability" INTEGER,
    "estimated_value" DECIMAL(14,2),
    "budget_note" TEXT,
    "competitors" TEXT,
    "partners" TEXT,
    "notes" TEXT,
    "project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_stages" (
    "id" TEXT NOT NULL,
    "bid_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "due_date" DATE,
    "status" "BidStageStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "bid_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_thresholds" (
    "id" TEXT NOT NULL,
    "bid_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "met" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "bid_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_scoring_criteria" (
    "id" TEXT NOT NULL,
    "bid_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "our_score" DECIMAL(5,2),
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "bid_scoring_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_payments" (
    "id" TEXT NOT NULL,
    "bid_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "due_date" DATE,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_date" DATE,
    "po_number" TEXT,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "bid_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bids_project_id_key" ON "bids"("project_id");

-- CreateIndex
CREATE INDEX "bids_status_idx" ON "bids"("status");

-- CreateIndex
CREATE INDEX "bid_stages_bid_id_idx" ON "bid_stages"("bid_id");

-- CreateIndex
CREATE INDEX "bid_thresholds_bid_id_idx" ON "bid_thresholds"("bid_id");

-- CreateIndex
CREATE INDEX "bid_scoring_criteria_bid_id_idx" ON "bid_scoring_criteria"("bid_id");

-- CreateIndex
CREATE INDEX "bid_payments_bid_id_idx" ON "bid_payments"("bid_id");

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_stages" ADD CONSTRAINT "bid_stages_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_thresholds" ADD CONSTRAINT "bid_thresholds_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_scoring_criteria" ADD CONSTRAINT "bid_scoring_criteria_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_payments" ADD CONSTRAINT "bid_payments_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;
