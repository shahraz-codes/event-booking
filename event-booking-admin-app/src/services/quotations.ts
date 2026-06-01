/**
 * Quotation CRUD via the Next.js admin API. All endpoints expect the
 * **internal DB id** of the booking (`Booking.id`, the cuid), NOT the
 * public `bookingId` (BNQ-YYYY-NNNN). Use `BookingRecord.id` here.
 */

import { apiFetch } from "@/lib/api-client";
import type {
  QuotationData,
  QuotationItemData,
  QuotationStatus,
} from "@/lib/types";

export interface QuotationItemInput {
  particular: string;
  quantity?: number | null;
  unit?: string | null;
  rate?: number | null;
  amount?: number | null;
  order: number;
}

export type QuotationWithItems = QuotationData;

export async function getQuotation(
  bookingInternalId: string
): Promise<QuotationWithItems | null> {
  return apiFetch<QuotationWithItems | null>("/api/admin/quotations", {
    query: { bookingId: bookingInternalId },
  });
}

export async function createQuotation(payload: {
  bookingInternalId: string;
  items: QuotationItemInput[];
  advanceAmount: number;
  notes?: string | null;
}): Promise<QuotationWithItems> {
  return apiFetch<QuotationWithItems>("/api/admin/quotations", {
    method: "POST",
    body: {
      bookingId: payload.bookingInternalId,
      items: payload.items,
      advanceAmount: payload.advanceAmount,
      notes: payload.notes ?? null,
    },
  });
}

export async function updateQuotation(payload: {
  quotationId: string;
  items: QuotationItemInput[];
  advanceAmount: number;
  notes?: string | null;
}): Promise<QuotationWithItems> {
  return apiFetch<QuotationWithItems>("/api/admin/quotations", {
    method: "PATCH",
    body: {
      quotationId: payload.quotationId,
      items: payload.items,
      advanceAmount: payload.advanceAmount,
      notes: payload.notes ?? null,
    },
  });
}

export async function sendQuotation(
  quotationId: string
): Promise<QuotationWithItems> {
  return apiFetch<QuotationWithItems>("/api/admin/quotations", {
    method: "PATCH",
    body: { quotationId, action: "send" },
  });
}

export async function finalizeQuotation(
  quotationId: string
): Promise<QuotationWithItems> {
  return apiFetch<QuotationWithItems>("/api/admin/quotations", {
    method: "PATCH",
    body: { quotationId, action: "finalize" },
  });
}

export type { QuotationStatus, QuotationItemData };
