/*
  Warnings:

  - A unique constraint covering the columns `[cvId]` on the table `quality_checks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "quality_checks" ADD COLUMN     "cvId" UUID;

-- CreateTable
CREATE TABLE "GeneratedCV" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firstName" TEXT NOT NULL,
    "professionalTitle" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactDetails" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileTitle" TEXT NOT NULL,
    "profileContent" TEXT NOT NULL,
    "image" TEXT NOT NULL DEFAULT 'default.png',
    "logo" TEXT,
    "pdfUrl" TEXT,
    "aiRaw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedCV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "responsibilities" JSONB NOT NULL,
    "cvId" UUID NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "cvId" UUID NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quality_checks_cvId_key" ON "quality_checks"("cvId");

-- AddForeignKey
ALTER TABLE "GeneratedCV" ADD CONSTRAINT "GeneratedCV_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "GeneratedCV"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "GeneratedCV"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "GeneratedCV"("id") ON DELETE CASCADE ON UPDATE CASCADE;
