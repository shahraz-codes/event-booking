import { getAdminSession } from "@/lib/auth";
import { getMediaUsage } from "@/services/homepage.service";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

export async function GET() {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const usage = await getMediaUsage();
    return Response.json({ success: true, data: usage });
  } catch (error) {
    console.error("Get media usage error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch media usage" },
      { status: 500 }
    );
  }
}
