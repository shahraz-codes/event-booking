import { NextRequest } from "next/server";
import { BookingStatus } from "@/generated/prisma/client";
import {
  getAllBookings,
  approveBooking,
  rejectBooking,
} from "@/services/booking.service";
import { getAdminSession } from "@/lib/auth";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

export async function GET(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const status = request.nextUrl.searchParams.get("status") as
      | BookingStatus
      | null;

    const validStatuses: BookingStatus[] = [
      "PENDING",
      "APPROVED",
      "REJECTED",
    ];
    const filter =
      status && validStatuses.includes(status) ? status : undefined;

    const bookings = await getAllBookings(filter);
    return Response.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const { id, action, adminNote } = body;

    if (!id || !action) {
      return Response.json(
        { success: false, error: "ID and action are required" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return Response.json(
        { success: false, error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const booking =
      action === "approve"
        ? await approveBooking(id, adminNote)
        : await rejectBooking(id, adminNote);

    return Response.json({ success: true, data: booking });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update booking";
    console.error("Update booking error:", error);
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
