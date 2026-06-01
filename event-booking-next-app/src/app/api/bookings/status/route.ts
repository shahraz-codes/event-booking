import { NextRequest } from "next/server";
import {
  getBookingByBookingId,
  getBookingByBookingIdForToken,
  getBookingByBookingIdWithSecret,
} from "@/services/booking.service";
import { verifyBookingToken } from "@/lib/magic-link";

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const token = url.searchParams.get("token");
    const bookingIdParam = url.searchParams.get("bookingId");
    const secretCode = url.searchParams.get("secretCode");

    // Path 1: magic-link token (Phase 4 / Phase 7 v1)
    if (token) {
      const verified = verifyBookingToken(token);
      if (!verified.valid || !verified.bookingId) {
        return Response.json(
          { success: false, error: "Invalid or expired access link" },
          { status: 401 }
        );
      }
      const booking = await getBookingByBookingIdForToken(verified.bookingId);
      if (!booking) {
        return Response.json(
          { success: false, error: "Booking not found" },
          { status: 404 }
        );
      }
      return Response.json({
        success: true,
        data: booking,
        accessLevel: "full",
      });
    }

    if (!bookingIdParam) {
      return Response.json(
        { success: false, error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Path 2: legacy bookingId + secretCode → full access
    if (secretCode) {
      const booking = await getBookingByBookingIdWithSecret(
        bookingIdParam.toUpperCase(),
        secretCode.toUpperCase()
      );
      if (!booking) {
        return Response.json(
          { success: false, error: "Booking not found or invalid secret code" },
          { status: 404 }
        );
      }
      return Response.json({ success: true, data: booking, accessLevel: "full" });
    }

    // Path 3: legacy bookingId only → basic access
    const booking = await getBookingByBookingId(bookingIdParam.toUpperCase());
    if (!booking) {
      return Response.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }
    return Response.json({ success: true, data: booking, accessLevel: "basic" });
  } catch (error) {
    console.error("Get booking status error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch booking status" },
      { status: 500 }
    );
  }
}
