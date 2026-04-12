import { NextRequest } from "next/server";
import { BookingStatus } from "@/generated/prisma/client";
import {
  getAllBookings,
  approveBooking,
  rejectBooking,
  cancelBooking,
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
    const { id, action, adminNote, totalAmount, advanceAmount } = body;

    if (!id || !action) {
      return Response.json(
        { success: false, error: "ID and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject", "cancel"].includes(action)) {
      return Response.json(
        { success: false, error: "Action must be 'approve', 'reject', or 'cancel'" },
        { status: 400 }
      );
    }

    let booking;
    if (action === "approve") {
      if (
        typeof totalAmount !== "number" ||
        totalAmount <= 0 ||
        typeof advanceAmount !== "number" ||
        advanceAmount < 0
      ) {
        return Response.json(
          {
            success: false,
            error: "Total amount and advance amount are required for approval",
          },
          { status: 400 }
        );
      }
      booking = await approveBooking(id, totalAmount, advanceAmount, adminNote);
    } else if (action === "cancel") {
      booking = await cancelBooking(id, adminNote);
    } else {
      booking = await rejectBooking(id, adminNote);
    }

    return Response.json({ success: true, data: booking });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update booking";
    console.error("Update booking error:", error);
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
