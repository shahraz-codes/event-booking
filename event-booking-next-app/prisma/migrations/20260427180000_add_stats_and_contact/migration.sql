-- CreateTable
CREATE TABLE "StatItem" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "suffix" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StatItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatItem_order_idx" ON "StatItem"("order");

-- AlterTable
ALTER TABLE "SiteSettings"
    ADD COLUMN "addressLine1" TEXT,
    ADD COLUMN "addressLine2" TEXT,
    ADD COLUMN "contactPhone" TEXT,
    ADD COLUMN "contactEmail" TEXT,
    ADD COLUMN "aboutBlurb" TEXT,
    ADD COLUMN "metaDescription" TEXT;
