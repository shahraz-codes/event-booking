import { NextRequest } from "next/server";
import {
  addCommentByBookingId,
  getCommentsByBookingId,
} from "@/services/booking.service";

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

    const comments = await getCommentsByBookingId(bookingId, secretCode);
    return Response.json({ success: true, data: comments });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch comments";
    console.error("Get comments error:", error);
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId, secretCode, message } = await request.json();

    if (!bookingId || !secretCode || !message?.trim()) {
      return Response.json(
        {
          success: false,
          error: "bookingId, secretCode, and message are required",
        },
        { status: 400 }
      );
    }

    const comment = await addCommentByBookingId(
      bookingId,
      secretCode,
      message.trim(),
      "CUSTOMER"
    );
    return Response.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to add comment";
    console.error("Add comment error:", error);
    return Response.json({ success: false, error: msg }, { status: 400 });
  }
}
