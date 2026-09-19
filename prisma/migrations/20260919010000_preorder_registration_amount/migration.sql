-- Existing registrations have unknown amounts; do not backfill them as zero.
ALTER TABLE "PreorderRegistrationItem" ADD COLUMN "amount" DECIMAL(12,2);
