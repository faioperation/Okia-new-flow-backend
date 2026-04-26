/*
  Warnings:

  - Added the required column `candidate_id` to the `quality_checks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "ai_check" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quality_checks" ADD COLUMN     "candidate_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
