-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "organization_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "organization_id" VARCHAR(255);
