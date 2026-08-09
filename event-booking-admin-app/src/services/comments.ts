import { apiFetch } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import type { BookingComment } from "@/lib/types";

/**
 * Read comments via Supabase (RLS-gated). The comment table joins to its
 * parent booking via `bookingId` (DB FK column name).
 */
export async function listCommentsForBooking(
  bookingDbId: string
): Promise<BookingComment[]> {
  const { data, error } = await supabase
    .from("Comment")
    .select("id, message, sender, createdAt")
    .eq("bookingId", bookingDbId)
    .order("createdAt", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as BookingComment[];
}

/**
 * Posting a comment as admin always goes through the Next.js API
 * (it triggers customer notification + audit log).
 */
export async function postAdminComment(
  publicBookingId: string,
  message: string
): Promise<BookingComment> {
  return apiFetch<BookingComment>("/api/admin/bookings/comments", {
    method: "POST",
    body: { bookingId: publicBookingId, message },
  });
}
