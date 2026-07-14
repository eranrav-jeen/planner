-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'prospect', 'inactive');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('full_time', 'part_time', 'contractor');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('fixed_price', 'time_and_materials');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "employee_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'prospect',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "title" TEXT,
    "department" TEXT,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'full_time',
    "monthly_capacity_hours" DECIMAL(7,2) NOT NULL DEFAULT 186,
    "cost_rate_hourly" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'planning',
    "start_date" DATE,
    "end_date" DATE,
    "income_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "hours_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "billing_type" "BillingType" NOT NULL DEFAULT 'time_and_materials',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assignments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "role_on_project" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_allocations" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "planned_hours" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "actual_hours" DECIMAL(7,2),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_overrides" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "capacity_hours" DECIMAL(7,2) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capacity_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "default_currency" TEXT NOT NULL DEFAULT 'ILS',
    "planning_window_months" INTEGER NOT NULL DEFAULT 6,
    "default_capacity_hours" DECIMAL(7,2) NOT NULL DEFAULT 186,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_department_idx" ON "employees"("department");

-- CreateIndex
CREATE INDEX "employees_is_active_idx" ON "employees"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE INDEX "projects_customer_id_idx" ON "projects"("customer_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignments_project_id_employee_id_key" ON "project_assignments"("project_id", "employee_id");

-- CreateIndex
CREATE INDEX "monthly_allocations_month_employee_id_idx" ON "monthly_allocations"("month", "employee_id");

-- CreateIndex
CREATE INDEX "monthly_allocations_project_id_month_idx" ON "monthly_allocations"("project_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_allocations_employee_id_project_id_month_key" ON "monthly_allocations"("employee_id", "project_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_overrides_employee_id_month_key" ON "capacity_overrides"("employee_id", "month");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_allocations" ADD CONSTRAINT "monthly_allocations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_allocations" ADD CONSTRAINT "monthly_allocations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_overrides" ADD CONSTRAINT "capacity_overrides_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
