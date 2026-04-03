import { getCalendarData } from "@/services/calendar.service";

export const revalidate = 30;

export async function GET() {
  try {
    const data = await getCalendarData();
    return Response.json({ success: true, data });
  } catch (error) {
    console.error("Get calendar error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}
