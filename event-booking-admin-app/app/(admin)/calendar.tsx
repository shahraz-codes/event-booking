import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ActionButton from "@/components/ActionButton";
import AdminCalendar from "@/components/AdminCalendar";
import Section from "@/components/Section";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";

interface CalendarData {
  bookedDates: string[];
  blockedDates: string[];
}
type CalendarInfo = Record<string, { approved: string[]; pending: string[] }>;

async function fetchCalendar(): Promise<CalendarData> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [booked, blocked] = await Promise.all([
    supabase
      .from("Booking")
      .select("date")
      .gte("date", todayIso)
      .in("status", ["APPROVED", "QUOTATION_FINALIZED"]),
    supabase.from("BlockedDate").select("date, reason").gte("date", todayIso),
  ]);
  if (booked.error) throw new Error(booked.error.message);
  if (blocked.error) throw new Error(blocked.error.message);
  return {
    bookedDates: (booked.data ?? []).map((r: { date: string }) => r.date.slice(0, 10)),
    blockedDates: (blocked.data ?? []).map((r: { date: string }) => r.date.slice(0, 10)),
  };
}

async function fetchCalendarInfo(): Promise<CalendarInfo> {
  return apiFetch<CalendarInfo>("/api/admin/calendar");
}

export default function CalendarScreen() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ["calendar"],
    queryFn: fetchCalendar,
  });

  const { data: calendarInfo, refetch: refetchInfo } = useQuery({
    queryKey: ["calendar-info"],
    queryFn: fetchCalendarInfo,
  });

  const blockMutation = useMutation({
    mutationFn: (payload: { date: string; reason?: string }) =>
      apiFetch("/api/admin/blocked-dates", { method: "POST", body: payload }),
    onSuccess: () => {
      setSelectedDate(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["calendar-info"] });
      Alert.alert("Blocked", "Date blocked successfully.");
    },
    onError: (err: Error) => Alert.alert("Failed", err.message),
  });

  const unblockMutation = useMutation({
    mutationFn: (date: string) =>
      apiFetch("/api/admin/blocked-dates", { method: "DELETE", body: { date } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["calendar-info"] });
    },
    onError: (err: Error) => Alert.alert("Failed", err.message),
  });

  function showBookedInfo(date: string) {
    const info = calendarInfo?.[date];
    const lines: string[] = [];
    if (info?.approved?.length) lines.push(`Booked: ${info.approved.join(", ")}`);
    if (info?.pending?.length) lines.push(`Pending: ${info.pending.join(", ")}`);
    Alert.alert(formatDate(date), lines.length ? lines.join("\n") : "Booked.");
  }

  function confirmUnblock(date: string) {
    Alert.alert(formatDate(date), "This date is blocked.", [
      { text: "Close", style: "cancel" },
      { text: "Unblock", style: "destructive", onPress: () => unblockMutation.mutate(date) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-200">
        <Text className="text-2xl font-extrabold text-gray-900">Calendar</Text>
        <Text className="text-xs text-gray-500 mt-0.5">Booked & blocked dates</Text>
      </View>

      <FlatList
        data={data?.blockedDates ?? []}
        keyExtractor={(d) => d}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching}
            onRefresh={() => {
              void refetch();
              void refetchInfo();
            }}
          />
        }
        ListHeaderComponent={
          <View className="gap-3 mb-4">
            {isError ? (
              <Text className="text-sm text-red-600 px-1">
                Couldn&apos;t load calendar: {error instanceof Error ? error.message : "error"}
              </Text>
            ) : null}

            <AdminCalendar
              bookedDates={data?.bookedDates ?? []}
              blockedDates={data?.blockedDates ?? []}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPressBooked={showBookedInfo}
            />

            <Section
              title="Block a date"
              subtitle={
                selectedDate
                  ? `Selected: ${formatDate(selectedDate)}`
                  : "Tap an available date in the calendar above."
              }
            >
              <View className="gap-2">
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Reason (optional)"
                  className="border border-gray-300 rounded-lg p-3 text-sm text-gray-900"
                />
                <ActionButton
                  label="Block selected date"
                  variant="primary"
                  disabled={!selectedDate}
                  onPress={() => {
                    if (!selectedDate) return;
                    blockMutation.mutate({ date: selectedDate, reason: reason || undefined });
                  }}
                  loading={blockMutation.isPending}
                  fullWidth
                />
              </View>
            </Section>

            <View className="px-1">
              <Text className="text-xs uppercase tracking-wider font-bold text-gray-500">
                Blocked dates ({data?.blockedDates.length ?? 0})
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => confirmUnblock(item)}
            className="bg-white rounded-xl border border-gray-200 p-3 mb-2 flex-row items-center justify-between"
          >
            <Text className="text-sm font-semibold text-gray-900">{formatDate(item)}</Text>
            <ActionButton
              label="Unblock"
              variant="secondary"
              size="sm"
              onPress={() => unblockMutation.mutate(item)}
              loading={unblockMutation.isPending}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <Text className="text-sm text-gray-500 italic px-2">No blocked dates.</Text>
        }
      />
    </SafeAreaView>
  );
}
