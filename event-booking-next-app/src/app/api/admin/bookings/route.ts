import { NextRequest } from "next/server";
import { BookingStatus } from "@/generated/prisma/client";
import {
  getAllBookings,
  approveBooking,
  rejectBooking,
  cancelBooking,
  approveCancellationRequest,
  declineCancellationRequest,
  approveDateChange,
  declineDateChange,
  acknowledgeDateChange,
  forceResolveConflict,
  getPotentialConflicts,
} from "@/services/booking.service";
import { getAdminSession } from "@/lib/auth";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

const VALID_STATUSES: BookingStatus[] = [
  "PENDING",
  "QUOTATION_SENT",
  "QUOTATION_FINALIZED",
  "APPROVED",
  "REJECTED",
  "CANCELLATION_REQUESTED",
  "DATE_CHANGE_REQUESTED",
  "CONFLICTED",
  "CANCELLED",
];

export async function GET(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const params = request.nextUrl.searchParams;
    const status = params.get("status") as BookingStatus | null;
    const conflictPreviewId = params.get("conflictPreviewId");

    // Phase 4d - admin requesting the conflict preview for the review screen
    if (conflictPreviewId) {
      const preview = await getPotentialConflicts(conflictPreviewId);
      if (!preview) {
        return Response.json(
          { success: false, error: "Booking not found" },
          { status: 404 }
        );
      }
      return Response.json({ success: true, data: preview });
    }

    const filter = status && VALID_STATUSES.includes(status) ? status : undefined;

    const pageParam = params.get("page");
    const pageSizeParam = params.get("pageSize");
    const usePagination = pageParam !== null || pageSizeParam !== null;

    if (usePagination) {
      const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(pageSizeParam ?? "10", 10) || 10)
      );
      const result = await getAllBookings(filter, { page, pageSize });
      return Response.json({ success: true, ...result });
    }

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

type AdminBookingAction =
  | "approve"
  | "reject"
  | "cancel"
  | "approveCancellation"
  | "declineCancellation"
  | "approveDateChange"
  | "declineDateChange"
  | "acknowledgeDateChange"
  | "forceResolveConflict";

const ADMIN_ACTIONS: AdminBookingAction[] = [
  "approve",
  "reject",
  "cancel",
  "approveCancellation",
  "declineCancellation",
  "approveDateChange",
  "declineDateChange",
  "acknowledgeDateChange",
  "forceResolveConflict",
];

export async function PATCH(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const {
      id,
      action,
      adminNote,
      totalAmount,
      advanceAmount,
      conflictAction,
      newDate,
    } = body as {
      id?: string;
      action?: AdminBookingAction;
      adminNote?: string;
      totalAmount?: number;
      advanceAmount?: number;
      conflictAction?: "force_cancel" | "reset_to_pending";
      newDate?: string;
    };

    if (!id || !action) {
      return Response.json(
        { success: false, error: "ID and action are required" },
        { status: 400 }
      );
    }

    if (!ADMIN_ACTIONS.includes(action)) {
      return Response.json(
        { success: false, error: "Unsupported action" },
        { status: 400 }
      );
    }

    switch (action) {
      case "approve": {
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
        const result = await approveBooking(
          id,
          totalAmount,
          advanceAmount,
          adminNote
        );
        return Response.json({ success: true, data: result });
      }
      case "cancel":
        return Response.json({ success: true, data: await cancelBooking(id, adminNote) });
      case "reject":
        return Response.json({ success: true, data: await rejectBooking(id, adminNote) });
      case "approveCancellation":
        return Response.json({
          success: true,
          data: await approveCancellationRequest(id, adminNote),
        });
      case "declineCancellation": {
        if (!adminNote || !adminNote.trim()) {
          return Response.json(
            { success: false, error: "adminNote is required when declining a cancellation" },
            { status: 400 }
          );
        }
        return Response.json({
          success: true,
          data: await declineCancellationRequest(id, adminNote.trim()),
        });
      }
      case "approveDateChange":
        return Response.json({
          success: true,
          data: await approveDateChange(id, adminNote),
        });
      case "declineDateChange": {
        if (!adminNote || !adminNote.trim()) {
          return Response.json(
            { success: false, error: "adminNote is required when declining a date change" },
            { status: 400 }
          );
        }
        return Response.json({
          success: true,
          data: await declineDateChange(id, adminNote.trim()),
        });
      }
      case "acknowledgeDateChange":
        return Response.json({
          success: true,
          data: await acknowledgeDateChange(id),
        });
      case "forceResolveConflict": {
        if (!conflictAction) {
          return Response.json(
            { success: false, error: "conflictAction is required" },
            { status: 400 }
          );
        }
        if (
          conflictAction !== "force_cancel" &&
          conflictAction !== "reset_to_pending"
        ) {
          return Response.json(
            { success: false, error: "Invalid conflictAction" },
            { status: 400 }
          );
        }
        return Response.json({
          success: true,
          data: await forceResolveConflict(id, conflictAction, {
            newDate,
            adminNote,
          }),
        });
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update booking";
    console.error("Update booking error:", error);
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
