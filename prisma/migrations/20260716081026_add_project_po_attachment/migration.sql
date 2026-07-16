-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "po_file_name" TEXT,
ADD COLUMN     "po_file_size" INTEGER,
ADD COLUMN     "po_mime_type" TEXT,
ADD COLUMN     "po_stored_name" TEXT,
ADD COLUMN     "po_uploaded_at" TIMESTAMP(3);
