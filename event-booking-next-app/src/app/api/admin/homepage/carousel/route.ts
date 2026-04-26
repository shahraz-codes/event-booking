import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import {
  getAllCarouselImages,
  createCarouselImage,
  updateCarouselImage,
  deleteCarouselImage,
} from "@/services/homepage.service";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

export async function GET() {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const items = await getAllCarouselImages();
    return Response.json({ success: true, data: items });
  } catch (error) {
    console.error("Get carousel error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch carousel images" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const { mediaFileId, alt } = body;

    if (!mediaFileId) {
      return Response.json(
        { success: false, error: "Media file is required" },
        { status: 400 }
      );
    }

    const item = await createCarouselImage({ mediaFileId, alt });
    revalidatePath("/");
    return Response.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Create carousel image error:", error);
    return Response.json(
      { success: false, error: "Failed to create carousel image" },
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

    const item = await updateCarouselImage(id, data);
    revalidatePath("/");
    return Response.json({ success: true, data: item });
  } catch (error) {
    console.error("Update carousel image error:", error);
    return Response.json(
      { success: false, error: "Failed to update carousel image" },
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

    await deleteCarouselImage(id);
    revalidatePath("/");
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete carousel image error:", error);
    return Response.json(
      { success: false, error: "Failed to delete carousel image" },
      { status: 500 }
    );
  }
}
