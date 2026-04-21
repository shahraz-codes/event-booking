import { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { deleteFromCloudinary } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminSession())) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { publicId, resourceType } = await request.json();

    if (!publicId) {
      return Response.json(
        { success: false, error: "publicId is required" },
        { status: 400 }
      );
    }

    await deleteFromCloudinary(
      publicId,
      (resourceType as "image" | "video" | "raw") || "image"
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Cleanup orphaned upload error:", error);
    return Response.json(
      { success: false, error: "Failed to cleanup" },
      { status: 500 }
    );
  }
}
