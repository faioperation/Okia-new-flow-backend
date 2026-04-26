/*
  Warnings:

  - You are about to drop the column `batch_id` on the `quality_checks` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[candidate_id]` on the table `quality_checks` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "quality_checks" DROP CONSTRAINT "quality_checks_batch_id_fkey";

-- DropIndex
DROP INDEX "quality_checks_batch_id_key";

-- AlterTable
ALTER TABLE "quality_checks" DROP COLUMN "batch_id";

-- CreateIndex
CREATE UNIQUE INDEX "quality_checks_candidate_id_key" ON "quality_checks"("candidate_id");
