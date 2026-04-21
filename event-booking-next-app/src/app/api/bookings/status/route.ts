import { NextRequest } from "next/server";
import {
  getBookingByBookingId,
  getBookingByBookingIdWithSecret,
} from "@/services/booking.service";

export async function GET(request: NextRequest) {
  try {
    const bookingId = request.nextUrl.searchParams.get("bookingId");
    const secretCode = request.nextUrl.searchParams.get("secretCode");

    if (!bookingId) {
      return Response.json(
        { success: false, error: "Booking ID is required" },
        { status: 400 }
      );
    }

    if (secretCode) {
      const booking = await getBookingByBookingIdWithSecret(
        bookingId.toUpperCase(),
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

    const booking = await getBookingByBookingId(bookingId.toUpperCase());

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
