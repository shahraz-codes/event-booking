import { NextRequest } from "next/server";
import { getBookingByBookingId } from "@/services/booking.service";

export async function GET(request: NextRequest) {
  try {
    const bookingId = request.nextUrl.searchParams.get("bookingId");

    if (!bookingId) {
      return Response.json(
        { success: false, error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const booking = await getBookingByBookingId(bookingId.toUpperCase());

    if (!booking) {
      return Response.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: booking });
  } catch (error) {
    console.error("Get booking status error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch booking status" },
      { status: 500 }
    );
  }
}
