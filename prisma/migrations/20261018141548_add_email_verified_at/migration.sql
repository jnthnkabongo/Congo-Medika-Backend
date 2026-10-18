-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "email_verified_at" TIMESTAMP(0);

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "email_verified_at" TIMESTAMP(0);
