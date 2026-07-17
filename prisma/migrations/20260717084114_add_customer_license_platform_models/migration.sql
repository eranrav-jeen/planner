-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "license_models_installed" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "license_platform_version" TEXT;
