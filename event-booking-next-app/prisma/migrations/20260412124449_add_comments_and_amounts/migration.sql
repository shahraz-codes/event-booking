-- CreateEnum
CREATE TYPE "CommentSender" AS ENUM ('ADMIN', 'CUSTOMER');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "advanceAmount" DOUBLE PRECISION,
ADD COLUMN     "totalAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sender" "CommentSender" NOT NULL,
    "bookingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_bookingId_idx" ON "Comment"("bookingId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
