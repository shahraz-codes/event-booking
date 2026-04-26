import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import {
  getAllServiceItems,
  createServiceItem,
  updateServiceItem,
  deleteServiceItem,
} from "@/services/homepage.service";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

export async function GET() {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const items = await getAllServiceItems();
    return Response.json({ success: true, data: items });
  } catch (error) {
    console.error("Get services error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch service items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const { title, desc, iconSvg } = body;

    if (!title || !desc || !iconSvg) {
      return Response.json(
        { success: false, error: "Title, description, and icon SVG are required" },
        { status: 400 }
      );
    }

    const item = await createServiceItem({ title, desc, iconSvg });
    revalidatePath("/");
    return Response.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Create service item error:", error);
    return Response.json(
      { success: false, error: "Failed to create service item" },
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

    const item = await updateServiceItem(id, data);
    revalidatePath("/");
    return Response.json({ success: true, data: item });
  } catch (error) {
    console.error("Update service item error:", error);
    return Response.json(
      { success: false, error: "Failed to update service item" },
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

    await deleteServiceItem(id);
    revalidatePath("/");
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete service item error:", error);
    return Response.json(
      { success: false, error: "Failed to delete service item" },
      { status: 500 }
    );
  }
}
