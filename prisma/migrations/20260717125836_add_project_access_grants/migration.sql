-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_restricted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "project_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_access_project_id_idx" ON "project_access"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_access_user_id_project_id_key" ON "project_access"("user_id", "project_id");

-- AddForeignKey
ALTER TABLE "project_access" ADD CONSTRAINT "project_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_access" ADD CONSTRAINT "project_access_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
