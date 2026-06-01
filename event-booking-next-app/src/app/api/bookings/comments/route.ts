import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  addComment,
  addCommentByBookingId,
  getComments,
  getCommentsByBookingId,
} from "@/services/booking.service";
import { verifyBookingToken } from "@/lib/magic-link";

async function resolveAccess(params: {
  token: string | null;
  bookingId: string | null;
  secretCode: string | null;
}): Promise<
  | { ok: false; status: number; error: string }
  | { ok: true; mode: "token"; bookingId: string; internalId: string }
  | { ok: true; mode: "secret"; bookingId: string; secretCode: string }
> {
  if (params.token) {
    const v = verifyBookingToken(params.token);
    if (!v.valid || !v.bookingId) {
      return { ok: false, status: 401, error: "Invalid or expired access link" };
    }
    const internal = await prisma.booking.findUnique({
      where: { bookingId: v.bookingId },
      select: { id: true },
    });
    if (!internal) {
      return { ok: false, status: 404, error: "Booking not found" };
    }
    return {
      ok: true,
      mode: "token",
      bookingId: v.bookingId,
      internalId: internal.id,
    };
  }
  if (params.bookingId && params.secretCode) {
    return {
      ok: true,
      mode: "secret",
      bookingId: params.bookingId,
      secretCode: params.secretCode,
    };
  }
  return {
    ok: false,
    status: 400,
    error: "Provide either token, or bookingId+secretCode",
  };
}

export async function GET(request: NextRequest) {
  try {
    const access = await resolveAccess({
      token: request.nextUrl.searchParams.get("token"),
      bookingId: request.nextUrl.searchParams.get("bookingId"),
      secretCode: request.nextUrl.searchParams.get("secretCode"),
    });
    if (!access.ok) {
      return Response.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const comments =
      access.mode === "token"
        ? await getComments(access.internalId)
        : await getCommentsByBookingId(access.bookingId, access.secretCode);

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
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) {
      return Response.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    const access = await resolveAccess({
      token: typeof body?.token === "string" ? body.token : null,
      bookingId: typeof body?.bookingId === "string" ? body.bookingId : null,
      secretCode: typeof body?.secretCode === "string" ? body.secretCode : null,
    });
    if (!access.ok) {
      return Response.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const comment =
      access.mode === "token"
        ? await addComment(access.internalId, message, "CUSTOMER")
        : await addCommentByBookingId(
            access.bookingId,
            access.secretCode,
            message,
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
