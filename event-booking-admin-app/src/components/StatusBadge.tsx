import { Text, View } from "react-native";

import {
  BOOKING_STATUS_COLORS,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@/lib/types";

interface Props {
  status: BookingStatus;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: Props) {
  const colors = BOOKING_STATUS_COLORS[status];
  const padding = size === "md" ? "px-3 py-1.5" : "px-2 py-0.5";
  const text = size === "md" ? "text-sm" : "text-xs";

  return (
    <View className={`self-start rounded-full ${colors.bg} ${padding}`}>
      <Text className={`${colors.text} font-semibold ${text}`}>
        {BOOKING_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}
