-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "external_ref" VARCHAR(255);

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "external_ref" VARCHAR(255);
