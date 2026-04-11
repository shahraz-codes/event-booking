-- CreateTable
CREATE TABLE "HeroSection" (
    "id" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "headingHighlight" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "gradient" TEXT NOT NULL DEFAULT 'from-amber-600 to-amber-800',
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "iconSvg" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryItem_order_idx" ON "GalleryItem"("order");

-- CreateIndex
CREATE INDEX "ServiceItem_order_idx" ON "ServiceItem"("order");
