import { NextRequest } from "next/server";
import {
  createQuotation,
  updateQuotation,
  sendQuotation,
  finalizeQuotation,
  getQuotationByBookingInternalId,
} from "@/services/booking.service";
import { getAdminSession } from "@/lib/auth";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

export async function GET(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();

    const bookingId = request.nextUrl.searchParams.get("bookingId");
    if (!bookingId) {
      return Response.json(
        { success: false, error: "bookingId is required" },
        { status: 400 }
      );
    }

    const quotation = await getQuotationByBookingInternalId(bookingId);
    return Response.json({ success: true, data: quotation });
  } catch (error) {
    console.error("Get quotation error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch quotation" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();

    const { bookingId, items, advanceAmount, notes } = await request.json();

    if (!bookingId || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { success: false, error: "bookingId and items are required" },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.particular?.trim()) {
        return Response.json(
          {
            success: false,
            error: "Each item must have a particular",
          },
          { status: 400 }
        );
      }
    }

    const quotation = await createQuotation(
      bookingId,
      items,
      advanceAmount ?? 0,
      notes
    );

    return Response.json(
      { success: true, data: quotation },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create quotation";
    console.error("Create quotation error:", error);
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();

    const { quotationId, action, items, advanceAmount, notes } =
      await request.json();

    if (!quotationId) {
      return Response.json(
        { success: false, error: "quotationId is required" },
        { status: 400 }
      );
    }

    let result;

    if (action === "send") {
      result = await sendQuotation(quotationId);
    } else if (action === "finalize") {
      result = await finalizeQuotation(quotationId);
    } else {
      if (!Array.isArray(items) || items.length === 0) {
        return Response.json(
          { success: false, error: "items are required for update" },
          { status: 400 }
        );
      }

      for (const item of items) {
        if (!item.particular?.trim()) {
          return Response.json(
            {
              success: false,
              error: "Each item must have a particular",
            },
            { status: 400 }
          );
        }
      }

      result = await updateQuotation(quotationId, items, advanceAmount, notes);
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update quotation";
    console.error("Update quotation error:", error);
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
