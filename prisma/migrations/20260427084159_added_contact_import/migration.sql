-- AlterTable
ALTER TABLE "imported_organizations" ADD COLUMN     "country" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "region" TEXT;

-- CreateTable
CREATE TABLE "import_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "importedOrganizationId" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_contacts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "import_contacts" ADD CONSTRAINT "import_contacts_importedOrganizationId_fkey" FOREIGN KEY ("importedOrganizationId") REFERENCES "imported_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_contacts" ADD CONSTRAINT "import_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
