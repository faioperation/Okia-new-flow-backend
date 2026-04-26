-- AlterTable
ALTER TABLE "bulk_upload_batches" ADD COLUMN     "ai_check" BOOLEAN NOT NULL DEFAULT false;


-- CreateTable
CREATE TABLE "quality_checks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quality_pass" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "quality_checks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "bulk_upload_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
