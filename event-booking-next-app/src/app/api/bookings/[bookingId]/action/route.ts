import { NextRequest } from "next/server";
import { z } from "zod";
import {
  customerCancelBooking,
  customerChangeDate,
  customerPickNewDateForConflicted,
  customerWithdrawRequest,
} from "@/services/booking.service";
import { verifyBookingToken } from "@/lib/magic-link";
import { getZodErrorMessage } from "@/types";

const ACTIONS = [
  "cancel",
  "request_cancel",
  "withdraw_request",
  "change_date",
  "request_date_change",
  "pick_new_date",
] as const;

const authSchema = z.object({
  token: z.string().min(1).optional(),
  secretCode: z.string().min(1).optional(),
}).refine((a) => a.token || a.secretCode, {
  message: "Either token or secretCode is required",
});

const bodySchema = z.object({
  action: z.enum(ACTIONS),
  auth: authSchema,
  reason: z.string().max(500).optional(),
  newDate: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId: rawBookingId } = await context.params;
    const bookingId = rawBookingId.toUpperCase();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { success: false, error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      );
    }

    const { action, auth, reason, newDate } = parsed.data;

    if (auth.token) {
      const v = verifyBookingToken(auth.token);
      if (!v.valid || v.bookingId !== bookingId) {
        return Response.json(
          { success: false, error: "Invalid or expired access link" },
          { status: 401 }
        );
      }
    }

    switch (action) {
      case "cancel":
      case "request_cancel": {
        const result = await customerCancelBooking(bookingId, auth, reason);
        return Response.json({ success: true, data: result });
      }
      case "withdraw_request": {
        const result = await customerWithdrawRequest(bookingId, auth);
        return Response.json({ success: true, data: result });
      }
      case "change_date":
      case "request_date_change": {
        if (!newDate) {
          return Response.json(
            { success: false, error: "newDate is required for date change" },
            { status: 400 }
          );
        }
        const result = await customerChangeDate(bookingId, auth, newDate, reason);
        return Response.json({ success: true, data: result });
      }
      case "pick_new_date": {
        if (!newDate) {
          return Response.json(
            { success: false, error: "newDate is required" },
            { status: 400 }
          );
        }
        const result = await customerPickNewDateForConflicted(
          bookingId,
          auth,
          newDate,
          reason
        );
        return Response.json({ success: true, data: result });
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to perform action";
    console.error("Customer action error:", error);
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
