import { useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ActionButton from "@/components/ActionButton";
import Section from "@/components/Section";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";

interface CalendarData {
  bookedDates: string[];
  blockedDates: string[];
}

async function fetchCalendar(): Promise<CalendarData> {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const [booked, blocked] = await Promise.all([
    supabase
      .from("Booking")
      .select("date")
      .gte("date", todayIso)
      .in("status", ["APPROVED", "QUOTATION_FINALIZED"]),
    supabase
      .from("BlockedDate")
      .select("date, reason")
      .gte("date", todayIso),
  ]);

  if (booked.error) throw new Error(booked.error.message);
  if (blocked.error) throw new Error(blocked.error.message);

  return {
    bookedDates: (booked.data ?? []).map((r: { date: string }) => r.date),
    blockedDates: (blocked.data ?? []).map((r: { date: string }) => r.date),
  };
}

export default function CalendarScreen() {
  const qc = useQueryClient();
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["calendar"],
    queryFn: fetchCalendar,
  });

  const blockMutation = useMutation({
    mutationFn: (payload: { date: string; reason?: string }) =>
      apiFetch("/api/admin/blocked-dates", { method: "POST", body: payload }),
    onSuccess: () => {
      setNewDate("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["calendar"] });
      Alert.alert("Blocked", "Date blocked successfully.");
    },
    onError: (err: Error) => Alert.alert("Failed", err.message),
  });

  const unblockMutation = useMutation({
    mutationFn: (date: string) =>
      apiFetch("/api/admin/blocked-dates", {
        method: "DELETE",
        body: { date },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
    onError: (err: Error) => Alert.alert("Failed", err.message),
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-200">
        <Text className="text-2xl font-extrabold text-gray-900">Calendar</Text>
        <Text className="text-xs text-gray-500 mt-0.5">
          Booked & blocked dates
        </Text>
      </View>

      <FlatList
        data={data?.blockedDates ?? []}
        keyExtractor={(d) => d}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching}
            onRefresh={() => refetch()}
          />
        }
        ListHeaderComponent={
          <View className="gap-3 mb-4">
            <Section
              title="Block a new date"
              subtitle="Enter date in YYYY-MM-DD format."
            >
              <View className="gap-2">
                <TextInput
                  value={newDate}
                  onChangeText={setNewDate}
                  placeholder="2026-12-25"
                  autoCapitalize="none"
                  className="border border-gray-300 rounded-lg p-3 text-sm text-gray-900"
                />
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Reason (optional)"
                  className="border border-gray-300 rounded-lg p-3 text-sm text-gray-900"
                />
                <ActionButton
                  label="Block date"
                  variant="primary"
                  onPress={() => {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                      Alert.alert("Invalid", "Use format YYYY-MM-DD");
                      return;
                    }
                    blockMutation.mutate({
                      date: newDate,
                      reason: reason || undefined,
                    });
                  }}
                  loading={blockMutation.isPending}
                  fullWidth
                />
              </View>
            </Section>

            <Section
              title={`Booked dates (${data?.bookedDates.length ?? 0})`}
            >
              {!data?.bookedDates.length ? (
                <Text className="text-sm text-gray-500 italic">
                  No upcoming bookings.
                </Text>
              ) : (
                data.bookedDates.map((d) => (
                  <Text key={d} className="text-sm text-gray-700 py-1">
                    • {formatDate(d)}
                  </Text>
                ))
              )}
            </Section>

            <View className="px-1">
              <Text className="text-xs uppercase tracking-wider font-bold text-gray-500">
                Blocked dates ({data?.blockedDates.length ?? 0})
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-xl border border-gray-200 p-3 mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-gray-900">
              {formatDate(item)}
            </Text>
            <ActionButton
              label="Unblock"
              variant="secondary"
              size="sm"
              onPress={() => unblockMutation.mutate(item)}
              loading={unblockMutation.isPending}
            />
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-sm text-gray-500 italic px-2">
            No blocked dates.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
