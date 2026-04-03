import { NextRequest } from "next/server";
import { bookingSchema, getZodErrorMessage } from "@/types";
import { createBooking } from "@/services/booking.service";
import { getCalendarData } from "@/services/calendar.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      );
    }

    const { bookedDates, blockedDates } = await getCalendarData();
    const unavailable = new Set([...bookedDates, ...blockedDates]);

    if (unavailable.has(parsed.data.date)) {
      return Response.json(
        { success: false, error: "Selected date is not available" },
        { status: 409 }
      );
    }

    const booking = await createBooking(parsed.data);

    return Response.json({ success: true, data: booking }, { status: 201 });
  } catch (error) {
    console.error("Create booking error:", error);
    return Response.json(
      { success: false, error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
