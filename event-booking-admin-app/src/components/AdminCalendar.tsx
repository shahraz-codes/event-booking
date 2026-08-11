import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

interface Props {
  bookedDates: string[]; // yyyy-MM-dd
  blockedDates: string[]; // yyyy-MM-dd
  selectedDate: string | null; // yyyy-MM-dd
  onSelectDate: (date: string) => void;
  onPressBooked?: (date: string) => void;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function AdminCalendar({
  bookedDates,
  blockedDates,
  selectedDate,
  onSelectDate,
  onPressBooked,
}: Props) {
  const [month, setMonth] = useState(new Date());
  const today = startOfDay(new Date());

  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);
  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);

  const cells = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    const out: Date[] = [];
    let d = start;
    while (d <= end) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [month]);

  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-3">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <Pressable
          onPress={() => setMonth(subMonths(month, 1))}
          hitSlop={8}
          className="px-3 py-1 rounded-lg active:bg-gray-100"
          accessibilityLabel="Previous month"
        >
          <Text className="text-lg text-gray-600">‹</Text>
        </Pressable>
        <Text className="text-base font-bold text-gray-900">
          {format(month, "MMMM yyyy")}
        </Text>
        <Pressable
          onPress={() => setMonth(addMonths(month, 1))}
          hitSlop={8}
          className="px-3 py-1 rounded-lg active:bg-gray-100"
          accessibilityLabel="Next month"
        >
          <Text className="text-lg text-gray-600">›</Text>
        </Pressable>
      </View>

      {/* Weekday row */}
      <View className="flex-row">
        {WEEKDAYS.map((w, i) => (
          <View key={i} className="flex-1 items-center py-1">
            <Text className="text-[10px] font-semibold uppercase text-gray-400">{w}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View className="flex-row flex-wrap">
        {cells.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const isPast = isBefore(day, today);
          const isToday = isSameDay(day, today);
          const isBooked = bookedSet.has(iso);
          const isBlocked = blockedSet.has(iso);
          const isSelected = selectedDate === iso;

          let bg = "bg-transparent";
          let textColor = inMonth ? "text-gray-800" : "text-gray-300";
          if (isBooked) {
            bg = "bg-red-100";
            textColor = "text-red-700";
          } else if (isBlocked) {
            bg = "bg-amber-100";
            textColor = "text-amber-700";
          }
          if (isSelected) {
            bg = "bg-brand-600";
            textColor = "text-white";
          }

          return (
            <View key={iso} style={{ width: `${100 / 7}%` }} className="p-0.5">
              <Pressable
                disabled={!inMonth}
                onPress={() => {
                  if (isBooked) {
                    onPressBooked?.(iso);
                    return;
                  }
                  if (isPast) return; // can't block/select a past date
                  onSelectDate(iso);
                }}
                className={`aspect-square items-center justify-center rounded-lg ${bg} ${
                  isToday && !isSelected ? "border border-brand-400" : ""
                }`}
              >
                <Text className={`text-sm ${textColor}`}>{format(day, "d")}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View className="flex-row flex-wrap gap-3 mt-2 px-1">
        <View className="flex-row items-center gap-1">
          <View className="h-3 w-3 rounded bg-red-100 border border-red-200" />
          <Text className="text-[10px] text-gray-500">Booked</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="h-3 w-3 rounded bg-amber-100 border border-amber-200" />
          <Text className="text-[10px] text-gray-500">Blocked</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="h-3 w-3 rounded bg-brand-600" />
          <Text className="text-[10px] text-gray-500">Selected</Text>
        </View>
      </View>
    </View>
  );
}
