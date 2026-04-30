-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "generated_cv_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_ids" UUID[],
    "subject" TEXT,
    "salutation" TEXT,
    "intro_paragraph" TEXT,
    "key_highlights" JSONB,
    "impact_statement" TEXT,
    "closing_statement" TEXT,
    "nb_footer" TEXT,
    "signature_block" JSONB,
    "raw_email_response" JSONB,
    "send_email" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "generated_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sent_email_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "generated_email_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_email_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_emails" ADD CONSTRAINT "generated_emails_generated_cv_id_fkey" FOREIGN KEY ("generated_cv_id") REFERENCES "GeneratedCV"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_emails" ADD CONSTRAINT "generated_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sent_email_logs" ADD CONSTRAINT "sent_email_logs_generated_email_id_fkey" FOREIGN KEY ("generated_email_id") REFERENCES "generated_emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sent_email_logs" ADD CONSTRAINT "sent_email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
