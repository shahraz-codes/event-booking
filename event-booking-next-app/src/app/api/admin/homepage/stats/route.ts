import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import {
  getAllStatItems,
  createStatItem,
  updateStatItem,
  deleteStatItem,
} from "@/services/homepage.service";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

export async function GET() {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const items = await getAllStatItems();
    return Response.json({ success: true, data: items });
  } catch (error) {
    console.error("Get stats error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const { value, suffix, label } = body;

    if (typeof value !== "number" || !Number.isFinite(value)) {
      return Response.json(
        { success: false, error: "Value must be a number" },
        { status: 400 }
      );
    }
    if (!label || typeof label !== "string") {
      return Response.json(
        { success: false, error: "Label is required" },
        { status: 400 }
      );
    }

    const item = await createStatItem({
      value: Math.trunc(value),
      suffix: typeof suffix === "string" ? suffix : "",
      label,
    });
    revalidatePath("/");
    return Response.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Create stat error:", error);
    return Response.json(
      { success: false, error: "Failed to create stat" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      return Response.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const data: {
      value?: number;
      suffix?: string;
      label?: string;
      order?: number;
      visible?: boolean;
    } = {};
    if (rest.value !== undefined) {
      if (typeof rest.value !== "number" || !Number.isFinite(rest.value)) {
        return Response.json(
          { success: false, error: "Value must be a number" },
          { status: 400 }
        );
      }
      data.value = Math.trunc(rest.value);
    }
    if (rest.suffix !== undefined) data.suffix = String(rest.suffix);
    if (rest.label !== undefined) data.label = String(rest.label);
    if (rest.order !== undefined) data.order = Number(rest.order);
    if (rest.visible !== undefined) data.visible = !!rest.visible;

    const item = await updateStatItem(id, data);
    revalidatePath("/");
    return Response.json({ success: true, data: item });
  } catch (error) {
    console.error("Update stat error:", error);
    return Response.json(
      { success: false, error: "Failed to update stat" },
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

    await deleteStatItem(id);
    revalidatePath("/");
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete stat error:", error);
    return Response.json(
      { success: false, error: "Failed to delete stat" },
      { status: 500 }
    );
  }
}
