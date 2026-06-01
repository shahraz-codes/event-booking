import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";

import BookingDateDisplay from "@/components/BookingDateDisplay";
import StatusBadge from "@/components/StatusBadge";
import type { BookingRecord } from "@/lib/types";

interface Props {
  booking: BookingRecord;
}

export default function BookingCard({ booking }: Props) {
  return (
    <Link href={`/(admin)/bookings/${booking.bookingId}`} asChild>
      <Pressable className="bg-white rounded-2xl border border-gray-200 p-4 mb-3 active:opacity-70">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 pr-2">
            <Text
              className="text-base font-bold text-gray-900"
              numberOfLines={1}
            >
              {booking.name}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {booking.bookingId}
            </Text>
          </View>
          <StatusBadge status={booking.status} />
        </View>

        <View className="flex-row items-center justify-between mt-2">
          <BookingDateDisplay
            date={booking.date}
            previousDate={booking.previousDate}
            requestedNewDate={booking.requestedNewDate}
            size="sm"
          />
          <View className="items-end">
            <Text className="text-xs text-gray-500">
              {booking.eventType.toUpperCase()}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {booking.numberOfAttendees} guests
            </Text>
          </View>
        </View>

        {booking.notes ? (
          <Text
            className="text-xs text-gray-600 mt-2 italic"
            numberOfLines={2}
          >
            "{booking.notes}"
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}
