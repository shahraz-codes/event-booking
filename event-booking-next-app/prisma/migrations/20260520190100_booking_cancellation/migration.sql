-- Phase 4b: customer cancellation
ALTER TYPE "BookingStatus" ADD VALUE 'CANCELLATION_REQUESTED';
ALTER TYPE "BookingStatus" ADD VALUE 'CANCELLED';

ALTER TABLE "Booking" ADD COLUMN "cancellationReason"      TEXT;
ALTER TABLE "Booking" ADD COLUMN "cancelledBy"             TEXT;
ALTER TABLE "Booking" ADD COLUMN "pendingRequestDecidedAt" TIMESTAMP(3);
