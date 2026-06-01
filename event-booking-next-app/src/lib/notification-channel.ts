/**
 * Source of truth (Phase 8) for which channels a notification for a given
 * event should be delivered on.
 *
 * Rules:
 *   - Critical events override the customer's opt-in preferences and are
 *     sent via every available channel (email if email present, WhatsApp
 *     if phone present).
 *   - Non-critical events follow the priority `email > whatsapp` if opted in.
 *
 * IMPORTANT: a mirror of this file lives in the RN admin app at the same
 * path (`src/lib/notification-channel.ts`). Keep them in sync.
 */

export type NotificationChannel = "email" | "whatsapp";

export interface NotificationEventMeta {
  type: NotificationEventType;
  /** Critical events bypass opt-out and send via every available channel. */
  isCritical: boolean;
}

export type NotificationEventType =
  | "booking.magic_link"
  | "booking.quotation_sent"
  | "booking.quotation_finalized"
  | "booking.approved"
  | "booking.rejected"
  | "booking.comment_added"
  | "booking.cancelled_by_customer"
  | "booking.cancellation_requested"
  | "booking.cancellation_approved"
  | "booking.cancellation_declined"
  | "booking.cancelled_by_admin"
  | "booking.date_changed_by_customer"
  | "booking.date_change_requested"
  | "booking.date_change_approved"
  | "booking.date_change_declined"
  | "booking.conflicted"
  | "booking.conflict_resolved";

/** Allowlist of critical events that bypass opt-out. See D9 in master plan. */
const CRITICAL_EVENTS: ReadonlySet<NotificationEventType> = new Set([
  "booking.cancellation_approved",
  "booking.cancelled_by_admin",
  "booking.date_change_declined",
  "booking.conflicted",
]);

export function eventMeta(type: NotificationEventType): NotificationEventMeta {
  return { type, isCritical: CRITICAL_EVENTS.has(type) };
}

export interface NotifyTargetBooking {
  phone: string | null | undefined;
  email: string | null | undefined;
  notifyViaWhatsapp: boolean;
  notifyViaEmail: boolean;
}

export function chooseChannels(
  booking: NotifyTargetBooking,
  event: NotificationEventMeta
): NotificationChannel[] {
  if (event.isCritical) {
    const channels: NotificationChannel[] = [];
    if (booking.email) channels.push("email");
    if (booking.phone) channels.push("whatsapp");
    return channels;
  }
  if (booking.notifyViaEmail && booking.email) return ["email"];
  if (booking.notifyViaWhatsapp && booking.phone) return ["whatsapp"];
  return [];
}
