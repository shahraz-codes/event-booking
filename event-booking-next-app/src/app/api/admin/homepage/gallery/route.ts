import { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import {
  getAllGalleryItems,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from "@/services/homepage.service";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

export async function GET() {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const items = await getAllGalleryItems();
    return Response.json({ success: true, data: items });
  } catch (error) {
    console.error("Get gallery error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch gallery items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const { title, desc, mediaFileId, gradient } = body;

    if (!title || !desc || !mediaFileId) {
      return Response.json(
        { success: false, error: "Title, description, and media file are required" },
        { status: 400 }
      );
    }

    const item = await createGalleryItem({ title, desc, mediaFileId, gradient });
    return Response.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Create gallery item error:", error);
    return Response.json(
      { success: false, error: "Failed to create gallery item" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return Response.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const item = await updateGalleryItem(id, data);
    return Response.json({ success: true, data: item });
  } catch (error) {
    console.error("Update gallery item error:", error);
    return Response.json(
      { success: false, error: "Failed to update gallery item" },
      { status: 500 }
    );
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

    await deleteGalleryItem(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete gallery item error:", error);
    return Response.json(
      { success: false, error: "Failed to delete gallery item" },
      { status: 500 }
    );
  }
}
