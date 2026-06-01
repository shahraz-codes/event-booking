"use client";

import { useMemo } from "react";
import {
  chooseChannels,
  eventMeta,
  type NotificationEventType,
  type NotifyTargetBooking,
} from "@/lib/notification-channel";
import {
  renderNotificationTemplate,
  type TemplateContext,
} from "@/lib/notification-templates";

interface Props {
  booking: NotifyTargetBooking & {
    name: string;
    bookingId: string;
    /** ISO date string */
    date: string;
    statusUrl?: string;
  };
  event: NotificationEventType;
  amount?: string;
  reason?: string;
  commentText?: string;
  winnerBookingId?: string;
  /** Render variant. `inline` is a small pill; `block` is full-width. */
  variant?: "inline" | "block";
  /** Override CTA label, otherwise uses sensible per-event default. */
  label?: string;
}

const WHATSAPP_GREEN = "#25D366";

export default function WhatsAppNotifyButton({
  booking,
  event,
  amount,
  reason,
  commentText,
  winnerBookingId,
  variant = "inline",
  label,
}: Props) {
  const meta = useMemo(() => eventMeta(event), [event]);
  const channels = useMemo(() => chooseChannels(booking, meta), [booking, meta]);

  // v1 only renders for WhatsApp-eligible customers. Critical events that
  // route to WhatsApp also show (per D5).
  if (!channels.includes("whatsapp") || !booking.phone) return null;

  const ctx: TemplateContext = {
    customerName: booking.name,
    bookingId: booking.bookingId,
    bookingDate: formatDate(booking.date),
    statusUrl: booking.statusUrl,
    amount,
    reason,
    commentText,
    winnerBookingId,
  };
  const tpl = renderNotificationTemplate(event, ctx);

  const phone = booking.phone.replace(/[^\d]/g, "");
  const text = encodeURIComponent(tpl.body);
  const href = `https://wa.me/${phone}?text=${text}`;

  const sizeClasses =
    variant === "block"
      ? "w-full justify-center px-4 py-2.5 text-sm"
      : "px-3 py-1.5 text-xs";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold text-white shadow-sm transition-colors hover:opacity-90 ${sizeClasses}`}
      style={{ backgroundColor: WHATSAPP_GREEN }}
      title={tpl.subject}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.521.074-.793.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413z" />
      </svg>
      {label ?? "Notify on WhatsApp"}
    </a>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
