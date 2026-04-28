-- AlterTable
ALTER TABLE "GeneratedCV" ADD COLUMN     "rawPdfPath" TEXT,
ADD COLUMN     "rawPdfUrl" TEXT;

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "raw_pdf_path" TEXT,
ADD COLUMN     "raw_pdf_url" TEXT;
