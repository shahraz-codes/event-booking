import { NextRequest } from "next/server";
import { addComment, getComments } from "@/services/booking.service";
import { getAdminSession } from "@/lib/auth";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

export async function GET(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();

    const bookingId = request.nextUrl.searchParams.get("bookingId");
    if (!bookingId) {
      return Response.json(
        { success: false, error: "bookingId is required" },
        { status: 400 }
      );
    }

    const comments = await getComments(bookingId);
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
    if (!(await getAdminSession())) return UNAUTHORIZED();

    const { bookingId, message } = await request.json();

    if (!bookingId || !message?.trim()) {
      return Response.json(
        { success: false, error: "bookingId and message are required" },
        { status: 400 }
      );
    }

    const comment = await addComment(bookingId, message.trim(), "ADMIN");
    return Response.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add comment";
    console.error("Add comment error:", error);
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
