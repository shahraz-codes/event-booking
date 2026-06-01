/**
 * Read bookings directly from Supabase (RLS-gated), and route writes
 * through the Next.js /api/admin/* endpoints via api-client.
 *
 * Column list mirrors what BOOKING_SENSITIVE_SELECT pulls server-side.
 */

import { apiFetch } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import type {
  AdminBookingAction,
  BookingRecord,
  BookingStatus,
} from "@/lib/types";

const BOOKING_COLUMNS = `
  id,
  bookingId,
  name,
  phone,
  email,
  date,
  eventType,
  numberOfAttendees,
  notes,
  status,
  adminNote,
  totalAmount,
  advanceAmount,
  notifyViaWhatsapp,
  notifyViaEmail,
  cancellationReason,
  cancelledBy,
  pendingRequestDecidedAt,
  requestedNewDate,
  dateChangeReason,
  previousDate,
  dateChangeAcknowledged,
  conflictedAt,
  conflictingBookingId,
  createdAt
`;

function mapBooking(row: any): BookingRecord {
  return row as BookingRecord;
}

export async function listBookings(filter?: {
  status?: BookingStatus | BookingStatus[];
  /** Case-insensitive search across `bookingId` (BNQ-…) and `name`. */
  search?: string;
}): Promise<BookingRecord[]> {
  let query = supabase
    .from("Booking")
    .select(BOOKING_COLUMNS)
    .order("createdAt", { ascending: false })
    .limit(500);

  if (filter?.status) {
    const arr = Array.isArray(filter.status) ? filter.status : [filter.status];
    query = query.in("status", arr);
  }

  const search = filter?.search?.trim();
  if (search) {
    // Escape PostgREST special chars so a customer name like "O'Connor"
    // doesn't break the .or() filter.
    const safe = search.replace(/[,()]/g, " ");
    query = query.or(
      `bookingId.ilike.%${safe}%,name.ilike.%${safe}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBooking);
}

export async function getBooking(
  publicBookingId: string
): Promise<BookingRecord | null> {
  const { data, error } = await supabase
    .from("Booking")
    .select(BOOKING_COLUMNS)
    .eq("bookingId", publicBookingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapBooking(data) : null;
}

/**
 * All booking mutations go through the Next.js admin API. The server-side
 * handler enforces the state machine and triggers cascade conflict logic.
 */
export interface AdminActionPayload {
  bookingId: string;
  action: AdminBookingAction;
  adminNote?: string;
  totalAmount?: number;
  advanceAmount?: number;
  reason?: string;
  confirmCascade?: boolean;
}

export async function performAdminAction(payload: AdminActionPayload) {
  return apiFetch<{ success: boolean }>("/api/admin/bookings", {
    method: "PATCH",
    body: payload,
  });
}

export async function getConflictPreview(publicBookingId: string) {
  return apiFetch<{ conflicts: BookingRecord[] }>("/api/admin/bookings", {
    query: { conflictPreviewId: publicBookingId },
  });
}
