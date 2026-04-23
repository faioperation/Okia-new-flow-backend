/*
  Warnings:

  - The primary key for the `Interaction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[interactionId]` on the table `Interaction` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `Interaction` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ALTER COLUMN "interactionId" DROP DEFAULT,
ALTER COLUMN "interactionId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Interaction_interactionId_seq";

-- CreateIndex
CREATE UNIQUE INDEX "Interaction_interactionId_key" ON "Interaction"("interactionId");
