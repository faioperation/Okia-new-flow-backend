/*
  Warnings:

  - The `contactDetails` column on the `GeneratedCV` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "GeneratedCV" DROP COLUMN "contactDetails",
ADD COLUMN     "contactDetails" JSONB;
