/*
  Warnings:

  - The `availability_status` column on the `candidates` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('available', 'notAvailable');

-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "availability_status",
ADD COLUMN     "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'available';

-- AlterTable
ALTER TABLE "generated_emails" ADD COLUMN     "logo_ekai" TEXT DEFAULT 'https://i.ibb.co.com/ymw1D2kx/edukai-Info.jpg';

-- AlterTable
ALTER TABLE "quality_checks" ADD COLUMN     "ai_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "availability_status" "AvailabilityStatus" DEFAULT 'available';
