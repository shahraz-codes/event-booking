/**
 * Mirror of `src/lib/notification-templates.ts` in event-booking-next-app.
 * KEEP THESE TWO FILES IN SYNC.
 */

import { APP_NAME } from "@/lib/config";
import type { NotificationEventType } from "@/lib/notification-channel";

export interface TemplateContext {
  customerName: string;
  bookingId: string;
  bookingDate: string;
  statusUrl?: string;
  amount?: string;
  reason?: string;
  winnerBookingId?: string;
  commentText?: string;
}

export interface RenderedTemplate {
  subject: string;
  body: string;
}

function appName(): string {
  return APP_NAME || "AR Banquets";
}

function withStatusUrl(body: string, ctx: TemplateContext): string {
  return ctx.statusUrl ? `${body}\n\nOpen: ${ctx.statusUrl}` : body;
}

export function renderNotificationTemplate(
  event: NotificationEventType,
  ctx: TemplateContext
): RenderedTemplate {
  const greet = `Hi ${ctx.customerName}`;
  const ref = `(${ctx.bookingId})`;
  const app = appName();

  switch (event) {
    case "booking.magic_link":
      return {
        subject: `Your ${app} booking link ${ref}`,
        body: withStatusUrl(
          `${greet}, thanks for your booking with ${app}! Use this private link to track your booking, get quotations, and chat with us.`,
          ctx
        ),
      };
    case "booking.quotation_sent":
      return {
        subject: `Quotation ready for booking ${ctx.bookingId}`,
        body: withStatusUrl(
          `${greet}, your quotation for ${app} booking ${ctx.bookingId} on ${ctx.bookingDate} is ready${ctx.amount ? ` (${ctx.amount})` : ""}. Please review and let us know if you have questions.`,
          ctx
        ),
      };
    case "booking.quotation_finalized":
      return {
        subject: `Quotation finalized ${ref}`,
        body: withStatusUrl(
          `${greet}, your quotation for ${app} booking ${ctx.bookingId} has been finalized${ctx.amount ? ` at ${ctx.amount}` : ""}. We'll need confirmation to lock in the date.`,
          ctx
        ),
      };
    case "booking.approved":
      return {
        subject: `Booking ${ctx.bookingId} approved`,
        body: withStatusUrl(
          `${greet}, your ${app} booking ${ctx.bookingId} for ${ctx.bookingDate} has been APPROVED. ${ctx.amount ? `Total: ${ctx.amount}. ` : ""}Looking forward to your event!`,
          ctx
        ),
      };
    case "booking.rejected":
      return {
        subject: `Booking ${ctx.bookingId} could not be confirmed`,
        body: withStatusUrl(
          `${greet}, unfortunately we cannot confirm ${app} booking ${ctx.bookingId} for ${ctx.bookingDate}.${ctx.reason ? ` ${ctx.reason}.` : ""} Reply to discuss alternatives.`,
          ctx
        ),
      };
    case "booking.comment_added":
      return {
        subject: `New message on booking ${ctx.bookingId}`,
        body: withStatusUrl(
          `${greet}, you have a new message from the ${app} team about booking ${ctx.bookingId}${ctx.commentText ? `:\n\n"${ctx.commentText}"` : "."}`,
          ctx
        ),
      };

    case "booking.cancelled_by_customer":
      return {
        subject: `Booking ${ctx.bookingId} cancelled by customer`,
        body: `${greet}, your ${app} booking ${ctx.bookingId} has been cancelled${ctx.reason ? `: ${ctx.reason}` : "."}`,
      };
    case "booking.cancellation_requested":
      return {
        subject: `Cancellation requested for ${ctx.bookingId}`,
        body: `${greet}, we received your request to cancel ${app} booking ${ctx.bookingId}. We'll review and respond soon.`,
      };
    case "booking.cancellation_approved":
      return {
        subject: `IMPORTANT: Booking ${ctx.bookingId} cancelled`,
        body: withStatusUrl(
          `${greet}, your cancellation request for ${app} booking ${ctx.bookingId} (${ctx.bookingDate}) has been approved. The booking is cancelled and the date is now free.`,
          ctx
        ),
      };
    case "booking.cancellation_declined":
      return {
        subject: `Cancellation declined for ${ctx.bookingId}`,
        body: withStatusUrl(
          `${greet}, your cancellation request for ${app} booking ${ctx.bookingId} was declined${ctx.reason ? `: ${ctx.reason}` : "."} Reply if you'd like to discuss.`,
          ctx
        ),
      };
    case "booking.cancelled_by_admin":
      return {
        subject: `IMPORTANT: Booking ${ctx.bookingId} cancelled by ${app}`,
        body: withStatusUrl(
          `${greet}, your ${app} booking ${ctx.bookingId} for ${ctx.bookingDate} has been cancelled${ctx.reason ? ` — ${ctx.reason}` : "."} Please reach out if you have questions.`,
          ctx
        ),
      };

    case "booking.date_changed_by_customer":
      return {
        subject: `Date changed for booking ${ctx.bookingId}`,
        body: `${greet}, your ${app} booking ${ctx.bookingId} date has been updated${ctx.reason ? ` — ${ctx.reason}` : "."}`,
      };
    case "booking.date_change_requested":
      return {
        subject: `Date change requested for ${ctx.bookingId}`,
        body: `${greet}, we received your request to change the date for ${app} booking ${ctx.bookingId}. We'll review and respond soon.`,
      };
    case "booking.date_change_approved":
      return {
        subject: `New date confirmed for ${ctx.bookingId}`,
        body: withStatusUrl(
          `${greet}, your date change for ${app} booking ${ctx.bookingId} has been approved. New date: ${ctx.bookingDate}.`,
          ctx
        ),
      };
    case "booking.date_change_declined":
      return {
        subject: `IMPORTANT: Date change declined for ${ctx.bookingId}`,
        body: withStatusUrl(
          `${greet}, your date change request for ${app} booking ${ctx.bookingId} could not be approved${ctx.reason ? ` — ${ctx.reason}` : "."} Reply if you'd like to discuss.`,
          ctx
        ),
      };

    case "booking.conflicted":
      return {
        subject: `IMPORTANT: Date unavailable for booking ${ctx.bookingId}`,
        body: withStatusUrl(
          `${greet}, the date ${ctx.bookingDate} for ${app} booking ${ctx.bookingId} is no longer available${ctx.winnerBookingId ? ` — another booking was confirmed on that date` : ""}. Please pick a new date or cancel using the link below.${ctx.reason ? `\n\nNote: ${ctx.reason}` : ""}`,
          ctx
        ),
      };
    case "booking.conflict_resolved":
      return {
        subject: `Conflict resolved for ${ctx.bookingId}`,
        body: `${greet}, the conflict on ${app} booking ${ctx.bookingId} has been resolved.`,
      };
  }
}
