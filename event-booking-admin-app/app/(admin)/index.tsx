import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import BookingCard from "@/components/BookingCard";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { listBookings } from "@/services/bookings";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/types";

interface StatusOption {
  key: string;
  label: string;
  statuses: BookingStatus[] | null;
}

// Single-select status filter. Keeping a couple of grouped buckets
// (active / review / closed) on top mirrors the previous tabbed UX
// without overflowing the screen.
const STATUS_OPTIONS: StatusOption[] = [
  { key: "all", label: "All statuses", statuses: null },
  {
    key: "active",
    label: "Active (Pending / Quotation)",
    statuses: ["PENDING", "QUOTATION_SENT", "QUOTATION_FINALIZED"],
  },
  {
    key: "review",
    label: "Needs Review (Cancel / Date change)",
    statuses: ["CANCELLATION_REQUESTED", "DATE_CHANGE_REQUESTED"],
  },
  { key: "PENDING", label: BOOKING_STATUS_LABELS.PENDING, statuses: ["PENDING"] },
  {
    key: "QUOTATION_SENT",
    label: BOOKING_STATUS_LABELS.QUOTATION_SENT,
    statuses: ["QUOTATION_SENT"],
  },
  {
    key: "QUOTATION_FINALIZED",
    label: BOOKING_STATUS_LABELS.QUOTATION_FINALIZED,
    statuses: ["QUOTATION_FINALIZED"],
  },
  {
    key: "APPROVED",
    label: BOOKING_STATUS_LABELS.APPROVED,
    statuses: ["APPROVED"],
  },
  {
    key: "CANCELLATION_REQUESTED",
    label: BOOKING_STATUS_LABELS.CANCELLATION_REQUESTED,
    statuses: ["CANCELLATION_REQUESTED"],
  },
  {
    key: "DATE_CHANGE_REQUESTED",
    label: BOOKING_STATUS_LABELS.DATE_CHANGE_REQUESTED,
    statuses: ["DATE_CHANGE_REQUESTED"],
  },
  {
    key: "CONFLICTED",
    label: BOOKING_STATUS_LABELS.CONFLICTED,
    statuses: ["CONFLICTED"],
  },
  {
    key: "REJECTED",
    label: BOOKING_STATUS_LABELS.REJECTED,
    statuses: ["REJECTED"],
  },
  {
    key: "CANCELLED",
    label: BOOKING_STATUS_LABELS.CANCELLED,
    statuses: ["CANCELLED"],
  },
];

export default function BookingsListScreen() {
  const { signOut } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<StatusOption>(
    STATUS_OPTIONS[0]
  );
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useRealtimeBookings();

  useEffect(() => {
    const handle = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ["bookings", selectedStatus.key, searchQuery],
    queryFn: () =>
      listBookings({
        status: selectedStatus.statuses ?? undefined,
        search: searchQuery || undefined,
      }),
  });

  const hasFilters = selectedStatus.key !== "all" || searchInput.length > 0;

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

      <View className="bg-white border-b border-gray-200 px-3 pt-3 pb-3">
        <View className="relative">
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by booking ID or customer name"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className="rounded-xl border border-gray-300 bg-white py-2.5 pl-3 pr-9 text-sm text-gray-900"
          />
          {searchInput.length > 0 && (
            <Pressable
              onPress={() => setSearchInput("")}
              hitSlop={8}
              accessibilityLabel="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1"
            >
              <Text className="text-gray-400 text-base">×</Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row items-center gap-2 mt-2">
          <Pressable
            onPress={() => setPickerOpen(true)}
            className="flex-1 flex-row items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 active:bg-gray-50"
          >
            <Text className="text-xs text-gray-500 mr-2">Status</Text>
            <Text className="flex-1 text-sm font-semibold text-gray-900" numberOfLines={1}>
              {selectedStatus.label}
            </Text>
            <Text className="text-gray-400 ml-2">▾</Text>
          </Pressable>

          {hasFilters && (
            <Pressable
              onPress={() => {
                setSelectedStatus(STATUS_OPTIONS[0]);
                setSearchInput("");
              }}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 active:bg-gray-50"
            >
              <Text className="text-xs font-semibold text-gray-700">Clear</Text>
            </Pressable>
          )}
        </View>
      </View>

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
            <View className="items-center justify-center py-20 px-6">
              <Text className="text-gray-500 text-sm text-center">
                {hasFilters
                  ? "No bookings match your filters."
                  : "No bookings yet."}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          onPress={() => setPickerOpen(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-2xl pt-4 pb-6 px-2"
          >
            <View className="px-3 pb-3 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900">
                Filter by status
              </Text>
              <Pressable
                onPress={() => setPickerOpen(false)}
                hitSlop={8}
                className="px-2 py-1"
                accessibilityLabel="Close"
              >
                <Text className="text-gray-500 text-xl">×</Text>
              </Pressable>
            </View>
            <FlatList
              data={STATUS_OPTIONS}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => {
                const isSelected = item.key === selectedStatus.key;
                return (
                  <Pressable
                    onPress={() => {
                      setSelectedStatus(item);
                      setPickerOpen(false);
                    }}
                    className={`flex-row items-center justify-between rounded-lg px-3 py-3 mx-1 ${
                      isSelected ? "bg-brand-50" : "active:bg-gray-50"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? "font-semibold text-brand-900"
                          : "text-gray-700"
                      }`}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Text className="text-brand-700 font-bold">✓</Text>
                    )}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
