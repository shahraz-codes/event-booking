import { useMemo } from "react";
import { Linking, Pressable, Text, View } from "react-native";

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
import { formatDate } from "@/lib/format";

interface Props {
  booking: NotifyTargetBooking & {
    name: string;
    bookingId: string;
    date: string;
    statusUrl?: string;
  };
  event: NotificationEventType;
  amount?: string;
  reason?: string;
  commentText?: string;
  winnerBookingId?: string;
  variant?: "inline" | "block";
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
  const channels = useMemo(
    () => chooseChannels(booking, meta),
    [booking, meta]
  );

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
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(tpl.body)}`;

  return (
    <Pressable
      onPress={() => Linking.openURL(href)}
      accessibilityRole="button"
      accessibilityLabel={tpl.subject}
      className={
        variant === "block"
          ? "w-full flex-row items-center justify-center gap-2 rounded-lg px-4 py-3"
          : "flex-row items-center gap-1.5 rounded-lg px-3 py-2"
      }
      style={{ backgroundColor: WHATSAPP_GREEN }}
    >
      <View>
        <Text className="text-white font-bold text-sm">
          {label ?? "Notify on WhatsApp"}
        </Text>
      </View>
    </Pressable>
  );
}
