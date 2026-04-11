-- AlterTable
ALTER TABLE "GalleryItem" ADD COLUMN     "mediaFileId" TEXT;

-- AlterTable
ALTER TABLE "HeroCarouselImage" ADD COLUMN     "mediaFileId" TEXT;

-- AlterTable
ALTER TABLE "HeroSection" ADD COLUMN     "logoMediaFileId" TEXT;

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_publicId_key" ON "MediaFile"("publicId");

-- AddForeignKey
ALTER TABLE "HeroSection" ADD CONSTRAINT "HeroSection_logoMediaFileId_fkey" FOREIGN KEY ("logoMediaFileId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroCarouselImage" ADD CONSTRAINT "HeroCarouselImage_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
