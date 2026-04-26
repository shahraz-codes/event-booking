import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { getHero, upsertHero } from "@/services/homepage.service";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

export async function GET() {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const hero = await getHero();
    return Response.json({ success: true, data: hero });
  } catch (error) {
    console.error("Get hero error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch hero" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const { subtitle, heading, headingHighlight, description, logoUrl, logoMediaFileId } = body;

    if (!subtitle || !heading || !headingHighlight || !description) {
      return Response.json(
        { success: false, error: "All text fields are required" },
        { status: 400 }
      );
    }

    const hero = await upsertHero({
      subtitle,
      heading,
      headingHighlight,
      description,
      logoUrl: logoUrl || null,
      logoMediaFileId: logoMediaFileId || null,
    });

    revalidatePath("/");
    return Response.json({ success: true, data: hero });
  } catch (error) {
    console.error("Update hero error:", error);
    return Response.json(
      { success: false, error: "Failed to update hero" },
      { status: 500 }
    );
  }
}
