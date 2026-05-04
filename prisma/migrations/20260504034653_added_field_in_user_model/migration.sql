/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "country" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "profilePicture" TEXT;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "imported_organization_id" UUID,
ALTER COLUMN "organization_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "import_contacts" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "organization_id" UUID;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_imported_organization_id_fkey" FOREIGN KEY ("imported_organization_id") REFERENCES "imported_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_contacts" ADD CONSTRAINT "import_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
