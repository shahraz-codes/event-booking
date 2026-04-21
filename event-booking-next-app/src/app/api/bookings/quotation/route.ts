import { NextRequest } from "next/server";
import { getBookingByBookingIdWithSecret } from "@/services/booking.service";

export async function GET(request: NextRequest) {
  try {
    const bookingId = request.nextUrl.searchParams.get("bookingId");
    const secretCode = request.nextUrl.searchParams.get("secretCode");

    if (!bookingId || !secretCode) {
      return Response.json(
        { success: false, error: "bookingId and secretCode are required" },
        { status: 400 }
      );
    }

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

    if (!booking.quotation) {
      return Response.json(
        { success: false, error: "No quotation available for this booking" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: booking.quotation });
  } catch (error) {
    console.error("Get quotation error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch quotation" },
      { status: 500 }
    );
  }
}
