-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "has_license" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "license_annual_amount" DECIMAL(14,2),
ADD COLUMN     "license_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "license_period_end" DATE,
ADD COLUMN     "license_period_start" DATE;
