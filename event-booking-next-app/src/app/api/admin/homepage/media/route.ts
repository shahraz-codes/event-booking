import { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import {
  getAllMediaFiles,
  createMediaFile,
  deleteMediaFile,
} from "@/services/homepage.service";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

export async function GET() {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const items = await getAllMediaFiles();
    return Response.json({ success: true, data: items });
  } catch (error) {
    console.error("Get media files error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch media files" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const { url, publicId, fileName, fileSize, mimeType, resourceType, width, height } = body;

    if (!url || !publicId || !fileName || !fileSize || !mimeType || !resourceType) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const item = await createMediaFile({
      url,
      publicId,
      fileName,
      fileSize,
      mimeType,
      resourceType,
      width: width ?? null,
      height: height ?? null,
    });
    return Response.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Create media file error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create media file";
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return Response.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    await deleteMediaFile(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete media file error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete media file";
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
