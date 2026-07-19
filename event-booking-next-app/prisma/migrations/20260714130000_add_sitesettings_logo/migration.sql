-- Fix 4: site/header logo managed from Homepage Manager, mirroring the existing
-- HeroSection logo (logoUrl + logoMediaFileId -> MediaFile).
--
-- After applying, update prisma/schema.prisma so Prisma's client matches (see
-- CURSOR_IMPLEMENTATION_GUIDE.md, Fix 4, step 1). If you generate this via
-- `prisma migrate dev`, edit the schema first and let Prisma emit the SQL
-- instead of hand-running this file.

ALTER TABLE "SiteSettings" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "logoMediaFileId" TEXT;

ALTER TABLE "SiteSettings"
  ADD CONSTRAINT "SiteSettings_logoMediaFileId_fkey"
  FOREIGN KEY ("logoMediaFileId") REFERENCES "MediaFile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SiteSettings_logoMediaFileId_idx"
  ON "SiteSettings"("logoMediaFileId");
