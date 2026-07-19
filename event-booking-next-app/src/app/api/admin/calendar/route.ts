import { getCalendarBookingsIndex } from "@/services/calendar.service";
import { getAdminSession } from "@/lib/auth";

// Admin-only: returns { [yyyy-MM-dd]: { approved: string[]; pending: string[] } }.
// This is the ONLY endpoint that exposes booking IDs per date. The public
// GET /api/calendar must never include IDs.
export async function GET() {
  if (!(await getAdminSession())) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const data = await getCalendarBookingsIndex();
    return Response.json({ success: true, data });
  } catch (error) {
    console.error("Get admin calendar error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch calendar bookings" },
      { status: 500 }
    );
  }
}
