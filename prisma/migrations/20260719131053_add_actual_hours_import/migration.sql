-- CreateTable
CREATE TABLE "time_import_batches" (
    "id" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "source_customer_name" TEXT,
    "customer_id" TEXT,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_hours" DECIMAL(10,2) NOT NULL,
    "entry_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "lines" JSONB NOT NULL,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committed_at" TIMESTAMP(3),

    CONSTRAINT "time_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entry_actuals" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "sub_project" TEXT,
    "hours" DECIMAL(8,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entry_actuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_aliases" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_import_batches_customer_id_idx" ON "time_import_batches"("customer_id");

-- CreateIndex
CREATE INDEX "time_import_batches_status_idx" ON "time_import_batches"("status");

-- CreateIndex
CREATE INDEX "time_entry_actuals_project_id_month_idx" ON "time_entry_actuals"("project_id", "month");

-- CreateIndex
CREATE INDEX "time_entry_actuals_employee_id_month_idx" ON "time_entry_actuals"("employee_id", "month");

-- CreateIndex
CREATE INDEX "time_entry_actuals_batch_id_idx" ON "time_entry_actuals"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "import_aliases_kind_source_name_key" ON "import_aliases"("kind", "source_name");

-- AddForeignKey
ALTER TABLE "time_import_batches" ADD CONSTRAINT "time_import_batches_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry_actuals" ADD CONSTRAINT "time_entry_actuals_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "time_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry_actuals" ADD CONSTRAINT "time_entry_actuals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry_actuals" ADD CONSTRAINT "time_entry_actuals_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
