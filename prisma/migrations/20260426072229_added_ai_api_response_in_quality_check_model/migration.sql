/*
  Warnings:

  - A unique constraint covering the columns `[batch_id]` on the table `quality_checks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "quality_checks" ADD COLUMN     "full_response" JSONB;

-- CreateTable
CREATE TABLE "imported_organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quality_checks_batch_id_key" ON "quality_checks"("batch_id");

-- AddForeignKey
ALTER TABLE "imported_organizations" ADD CONSTRAINT "imported_organizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
