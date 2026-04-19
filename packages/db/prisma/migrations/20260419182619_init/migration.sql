-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('super_admin', 'tasarim', 'modalist', 'planlama', 'satinalma', 'uretim');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('TASLAK', 'NUMUNE_HAZIRLANIYOR', 'REVIZE', 'ONAYLANDI', 'IPTAL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('TASLAK', 'BOM_DOGRULAMA', 'MALZEME_BEKLIYOR', 'HAZIR', 'ATOLYEYE_GONDERILDI', 'KAPALI', 'IPTAL');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('OLUSTURULDU', 'KESIM', 'DIKIM', 'KALITE', 'PAKETLEME', 'TAMAMLANDI', 'DURAKLADI', 'IPTAL');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('HAZIRLANIYOR', 'OK', 'REVIZE', 'RED');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('TASLAK', 'ONAY_BEKLIYOR', 'ONAYLI', 'TESLIM_ALINDI', 'IPTAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'transition', 'login', 'logout');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'DONE', 'ERROR', 'CONFLICT');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('teknik_cizim', 'foto', 'kalip', 'diger');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('kumas', 'aksesuar', 'iplik', 'etiket', 'ambalaj', 'diger');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colors" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT,

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sizes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daily_capacity_pcs" INTEGER NOT NULL,
    "max_batch_pcs" INTEGER NOT NULL DEFAULT 500,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_capacity_day" (
    "id" BIGSERIAL NOT NULL,
    "workshop_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "booked_pcs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "workshop_capacity_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "designer_id" UUID,
    "due_date" TIMESTAMP(3),
    "status" "ModelStatus" NOT NULL DEFAULT 'TASLAK',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_attachment" (
    "id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_by" UUID,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample" (
    "id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "fabric_note" TEXT,
    "accessory_note" TEXT,
    "quality_note" TEXT,
    "critical_notes" TEXT,
    "status" "SampleStatus" NOT NULL DEFAULT 'HAZIRLANIYOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pattern" (
    "id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "assigned_to" UUID,
    "started_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "total_revisions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pattern_version" (
    "id" UUID NOT NULL,
    "pattern_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "file_url" TEXT,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pattern_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "model_id" UUID NOT NULL,
    "workshop_id" UUID,
    "total_qty" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'TASLAK',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_variant" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "color_id" UUID NOT NULL,
    "size_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "order_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "parent_work_order_id" UUID,
    "qty" INTEGER NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'OLUSTURULDU',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_event" (
    "id" BIGSERIAL NOT NULL,
    "work_order_id" UUID NOT NULL,
    "from_status" "WorkOrderStatus",
    "to_status" "WorkOrderStatus" NOT NULL,
    "reason" TEXT,
    "user_id" UUID,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "uom" TEXT NOT NULL,
    "supplier_default_id" UUID,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "warehouse" TEXT NOT NULL DEFAULT 'MERKEZ',
    "qty_on_hand" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "qty_reserved" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom" (
    "id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_item" (
    "id" UUID NOT NULL,
    "bom_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "qty_per_unit" DECIMAL(14,4) NOT NULL,
    "uom" TEXT NOT NULL,
    "waste_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "bom_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "order_id" UUID,
    "supplier_id" UUID,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'TASLAK',
    "due_date" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request_item" (
    "id" UUID NOT NULL,
    "purchase_request_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "unit_price" DECIMAL(14,2),
    "note" TEXT,

    CONSTRAINT "purchase_request_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_mapping" (
    "id" BIGSERIAL NOT NULL,
    "entity" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "mikro_id" TEXT NOT NULL,
    "hash" TEXT,
    "last_pulled_at" TIMESTAMP(3),
    "last_pushed_at" TIMESTAMP(3),

    CONSTRAINT "sync_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_queue" (
    "id" BIGSERIAL NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "entity" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "audit_log_entity_entity_id_ts_idx" ON "audit_log"("entity", "entity_id", "ts" DESC);

-- CreateIndex
CREATE INDEX "audit_log_ts_idx" ON "audit_log"("ts" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_code_key" ON "seasons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "colors_code_key" ON "colors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sizes_code_key" ON "sizes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "workshops_code_key" ON "workshops"("code");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_capacity_day_workshop_id_day_key" ON "workshop_capacity_day"("workshop_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "model_code_key" ON "model"("code");

-- CreateIndex
CREATE INDEX "model_status_due_date_idx" ON "model"("status", "due_date");

-- CreateIndex
CREATE INDEX "model_attachment_model_id_idx" ON "model_attachment"("model_id");

-- CreateIndex
CREATE INDEX "pattern_model_id_idx" ON "pattern"("model_id");

-- CreateIndex
CREATE UNIQUE INDEX "pattern_version_pattern_id_version_no_key" ON "pattern_version"("pattern_id", "version_no");

-- CreateIndex
CREATE UNIQUE INDEX "order_code_key" ON "order"("code");

-- CreateIndex
CREATE INDEX "order_status_due_date_idx" ON "order"("status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "order_variant_order_id_color_id_size_id_key" ON "order_variant"("order_id", "color_id", "size_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_code_key" ON "work_order"("code");

-- CreateIndex
CREATE INDEX "work_order_order_id_idx" ON "work_order"("order_id");

-- CreateIndex
CREATE INDEX "work_order_status_idx" ON "work_order"("status");

-- CreateIndex
CREATE INDEX "work_order_event_work_order_id_ts_idx" ON "work_order_event"("work_order_id", "ts" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "material_code_key" ON "material"("code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_material_id_key" ON "stock"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "bom_model_id_version_key" ON "bom"("model_id", "version");

-- CreateIndex
CREATE INDEX "bom_item_bom_id_idx" ON "bom_item"("bom_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_request_code_key" ON "purchase_request"("code");

-- CreateIndex
CREATE INDEX "purchase_request_status_idx" ON "purchase_request"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sync_mapping_entity_local_id_key" ON "sync_mapping"("entity", "local_id");

-- CreateIndex
CREATE UNIQUE INDEX "sync_mapping_entity_mikro_id_key" ON "sync_mapping"("entity", "mikro_id");

-- CreateIndex
CREATE INDEX "sync_queue_status_ts_idx" ON "sync_queue"("status", "ts");

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_capacity_day" ADD CONSTRAINT "workshop_capacity_day_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model" ADD CONSTRAINT "model_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model" ADD CONSTRAINT "model_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model" ADD CONSTRAINT "model_designer_id_fkey" FOREIGN KEY ("designer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_attachment" ADD CONSTRAINT "model_attachment_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample" ADD CONSTRAINT "sample_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern" ADD CONSTRAINT "pattern_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern" ADD CONSTRAINT "pattern_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern_version" ADD CONSTRAINT "pattern_version_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "pattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_variant" ADD CONSTRAINT "order_variant_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_variant" ADD CONSTRAINT "order_variant_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_variant" ADD CONSTRAINT "order_variant_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_parent_work_order_id_fkey" FOREIGN KEY ("parent_work_order_id") REFERENCES "work_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_event" ADD CONSTRAINT "work_order_event_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_supplier_default_id_fkey" FOREIGN KEY ("supplier_default_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom" ADD CONSTRAINT "bom_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_item" ADD CONSTRAINT "bom_item_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "bom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_item" ADD CONSTRAINT "bom_item_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request" ADD CONSTRAINT "purchase_request_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request" ADD CONSTRAINT "purchase_request_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_item" ADD CONSTRAINT "purchase_request_item_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_item" ADD CONSTRAINT "purchase_request_item_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
