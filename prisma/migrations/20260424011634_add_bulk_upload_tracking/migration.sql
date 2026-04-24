-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "batch_id" UUID;

-- CreateTable
CREATE TABLE "bulk_upload_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "total_files" INTEGER NOT NULL DEFAULT 0,
    "completed_files" INTEGER NOT NULL DEFAULT 0,
    "failed_files" INTEGER NOT NULL DEFAULT 0,
    "duplicate_files" INTEGER NOT NULL DEFAULT 0,
    "pending_files" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "bulk_upload_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_upload_fail_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" TEXT,
    "reason" TEXT NOT NULL,
    "error_stack" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_upload_fail_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bulk_upload_fail_logs" ADD CONSTRAINT "bulk_upload_fail_logs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "bulk_upload_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "bulk_upload_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
