-- Bid payments: replace due/paid dates with a two-step checkbox flow
-- ("sent for payment" once the milestone is delivered, then "paid").
ALTER TABLE "bid_payments" ADD COLUMN "sent_for_payment" BOOLEAN NOT NULL DEFAULT false;

-- Anything already paid was necessarily sent for payment.
UPDATE "bid_payments" SET "sent_for_payment" = true WHERE "paid" = true;

ALTER TABLE "bid_payments" DROP COLUMN "due_date";
ALTER TABLE "bid_payments" DROP COLUMN "paid_date";
