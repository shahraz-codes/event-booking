-- Phase 4: optional email + per-customer notification preferences on Booking
ALTER TABLE "Booking" ADD COLUMN "email"             TEXT;
ALTER TABLE "Booking" ADD COLUMN "notifyViaWhatsapp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "notifyViaEmail"    BOOLEAN NOT NULL DEFAULT false;
