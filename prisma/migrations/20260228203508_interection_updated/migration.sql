/*
  Warnings:

  - The primary key for the `Interaction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Interaction` table. All the data in the column will be lost.
  - The `interactionId` column on the `Interaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "Interaction_interactionId_key";

-- AlterTable
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_pkey",
DROP COLUMN "id",
DROP COLUMN "interactionId",
ADD COLUMN     "interactionId" SERIAL NOT NULL,
ADD CONSTRAINT "Interaction_pkey" PRIMARY KEY ("interactionId");
