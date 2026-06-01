-- Phase 4c: customer date change
ALTER TYPE "BookingStatus" ADD VALUE 'DATE_CHANGE_REQUESTED';

ALTER TABLE "Booking" ADD COLUMN "requestedNewDate"       DATE;
ALTER TABLE "Booking" ADD COLUMN "dateChangeReason"       TEXT;
ALTER TABLE "Booking" ADD COLUMN "previousDate"           DATE;
ALTER TABLE "Booking" ADD COLUMN "dateChangeAcknowledged" BOOLEAN NOT NULL DEFAULT true;
