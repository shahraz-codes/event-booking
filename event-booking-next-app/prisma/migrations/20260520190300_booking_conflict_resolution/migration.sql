-- Phase 4d: cascade conflict resolution
ALTER TYPE "BookingStatus" ADD VALUE 'CONFLICTED';

ALTER TABLE "Booking" ADD COLUMN "conflictedAt"          TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "conflictingBookingId"  TEXT;

ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_conflictingBookingId_fkey"
    FOREIGN KEY ("conflictingBookingId")
    REFERENCES "Booking"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Booking_conflictingBookingId_idx" ON "Booking"("conflictingBookingId");
