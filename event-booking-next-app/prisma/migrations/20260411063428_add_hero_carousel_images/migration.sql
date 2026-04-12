-- CreateTable
CREATE TABLE "HeroCarouselImage" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HeroCarouselImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroCarouselImage_order_idx" ON "HeroCarouselImage"("order");
