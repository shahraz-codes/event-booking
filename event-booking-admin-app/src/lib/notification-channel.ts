/**
 * Mirror of `src/lib/notification-channel.ts` in event-booking-next-app.
 * KEEP THESE TWO FILES IN SYNC.
 */

export type NotificationChannel = "email" | "whatsapp";

export interface NotificationEventMeta {
  type: NotificationEventType;
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
