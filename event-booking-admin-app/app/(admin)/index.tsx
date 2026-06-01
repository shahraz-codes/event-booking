import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import BookingCard from "@/components/BookingCard";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { listBookings } from "@/services/bookings";
import type { BookingStatus } from "@/lib/types";

interface TabDef {
  key: string;
  label: string;
  statuses: BookingStatus[] | null;
}

const TABS: TabDef[] = [
  {
    key: "active",
    label: "Active",
    statuses: ["PENDING", "QUOTATION_SENT", "QUOTATION_FINALIZED"],
  },
  {
    key: "review",
    label: "Needs Review",
    statuses: ["CANCELLATION_REQUESTED", "DATE_CHANGE_REQUESTED"],
  },
  { key: "conflicts", label: "Conflicts", statuses: ["CONFLICTED"] },
  { key: "approved", label: "Approved", statuses: ["APPROVED"] },
  { key: "closed", label: "Closed", statuses: ["REJECTED", "CANCELLED"] },
  { key: "all", label: "All", statuses: null },
];

export default function BookingsListScreen() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabDef>(TABS[0]);

  useRealtimeBookings();

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ["bookings", activeTab.key],
    queryFn: () =>
      listBookings(
        activeTab.statuses ? { status: activeTab.statuses } : undefined
      ),
  });

  const counts = useMemo(() => {
    if (!data) return {} as Record<string, number>;
    return TABS.reduce(
      (acc, tab) => {
        if (!tab.statuses) {
          acc[tab.key] = data.length;
        } else {
          acc[tab.key] = data.filter((b) =>
            tab.statuses!.includes(b.status)
          ).length;
        }
        return acc;
      },
      {} as Record<string, number>
    );
  }, [data]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-extrabold text-gray-900">
            Bookings
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            Live • powered by Supabase Realtime
          </Text>
        </View>
        <Pressable
          onPress={() => signOut()}
          className="px-3 py-2 rounded-lg bg-gray-100 active:bg-gray-200"
        >
          <Text className="text-xs font-semibold text-gray-700">Sign out</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}
        className="bg-white border-b border-gray-200 flex-grow-0"
      >
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full mr-2 border ${
                isActive
                  ? "bg-brand-600 border-brand-600"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isActive ? "text-white" : "text-gray-700"
                }`}
              >
                {tab.label}
                {counts[tab.key] !== undefined ? ` (${counts[tab.key]})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? (
        <View className="p-4">
          <Text className="text-red-600">
            Failed to load bookings: {(error as Error).message}
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BookingCard booking={item} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-gray-500 text-sm">
                No bookings in this tab yet.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
