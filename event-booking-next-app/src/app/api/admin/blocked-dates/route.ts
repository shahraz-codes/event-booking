import { NextRequest } from "next/server";
import {
  addBlockedDate,
  removeBlockedDate,
  getBlockedDates,
} from "@/services/calendar.service";
import { getAdminSession } from "@/lib/auth";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

export async function GET() {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const dates = await getBlockedDates();
    return Response.json({ success: true, data: dates });
  } catch (error) {
    console.error("Get blocked dates error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch blocked dates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const { date, reason } = body;

    if (!date) {
      return Response.json(
        { success: false, error: "Date is required" },
        { status: 400 }
      );
    }

    const blocked = await addBlockedDate(date, reason);
    return Response.json({ success: true, data: blocked }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to block date";
    console.error("Block date error:", error);
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const { id } = await request.json();

    if (!id) {
      return Response.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    await removeBlockedDate(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Remove blocked date error:", error);
    return Response.json(
      { success: false, error: "Failed to remove blocked date" },
      { status: 500 }
    );
  }
}
