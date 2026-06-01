import { Text, View } from "react-native";

import { formatDate } from "@/lib/format";

interface Props {
  date: string;
  previousDate?: string | null;
  requestedNewDate?: string | null;
  size?: "sm" | "md" | "lg";
}

/**
 * Shows the booking's date, with a strike-through over the previous date
 * (after a customer-initiated date change) or the requested new date
 * (while a date-change request is pending).
 */
export default function BookingDateDisplay({
  date,
  previousDate,
  requestedNewDate,
  size = "md",
}: Props) {
  const textSize =
    size === "lg" ? "text-lg" : size === "md" ? "text-base" : "text-sm";
  const muted = size === "lg" ? "text-sm" : "text-xs";

  return (
    <View className="flex-col gap-0.5">
      <View className="flex-row flex-wrap items-baseline gap-1.5">
        {previousDate ? (
          <Text className={`${muted} text-gray-400 line-through`}>
            {formatDate(previousDate)}
          </Text>
        ) : null}
        <Text className={`${textSize} font-semibold text-gray-900`}>
          {formatDate(date)}
        </Text>
      </View>
      {requestedNewDate ? (
        <Text className={`${muted} text-purple-700`}>
          Requested: {formatDate(requestedNewDate)}
        </Text>
      ) : null}
    </View>
  );
}
