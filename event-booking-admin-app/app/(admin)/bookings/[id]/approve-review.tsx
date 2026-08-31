import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ActionButton from "@/components/ActionButton";
import Section from "@/components/Section";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { BookingRecord, BookingStatus } from "@/lib/types";
import { getBooking, performAdminAction } from "@/services/bookings";

interface ConflictRow {
  id: string;
  bookingId: string;
  name: string;
  phone: string;
  email: string | null;
  status: BookingStatus;
  eventType: string;
  numberOfAttendees: number;
  notifyViaWhatsapp: boolean;
  notifyViaEmail: boolean;
  adminNote: string | null;
  createdAt: string;
  quotation?: {
    status: string;
    totalAmount: number;
    updatedAt: string;
  } | null;
  comments?: Array<{
    id: string;
    message: string;
    sender: "ADMIN" | "CUSTOMER";
    createdAt: string;
  }>;
}

interface ConflictPreview {
  booking: {
    id: string;
    bookingId: string;
    name: string;
    date: string;
    status: BookingStatus;
  };
  conflicts: ConflictRow[];
}

async function fetchConflictPreview(
  internalId: string
): Promise<ConflictPreview> {
  return apiFetch<ConflictPreview>("/api/admin/bookings", {
    query: { conflictPreviewId: internalId },
  });
}

export default function ApproveReviewScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const bookingPublicId = String(params.id ?? "");

  const [adminNote, setAdminNote] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");

  const bookingQuery = useQuery({
    queryKey: ["bookings", "detail", bookingPublicId],
    queryFn: () => getBooking(bookingPublicId),
    enabled: !!bookingPublicId,
  });
  const booking: BookingRecord | null | undefined = bookingQuery.data;

  useEffect(() => {
    if (booking) {
      setTotalAmount(String(booking.totalAmount ?? ""));
      setAdvanceAmount(String(booking.advanceAmount ?? ""));
    }
  }, [booking]);

  const previewQuery = useQuery({
    queryKey: ["conflict-preview", booking?.id],
    queryFn: () => fetchConflictPreview(booking!.id),
    enabled: !!booking?.id,
  });
  const preview = previewQuery.data;

  const approveMutation = useMutation({
    mutationFn: () =>
      performAdminAction({
        id: booking!.id,
        action: "approve",
        adminNote: adminNote || undefined,
        totalAmount: Number(totalAmount) || 0,
        advanceAmount: Number(advanceAmount) || 0,
        confirmCascade: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      Alert.alert(
        "Approved",
        preview?.conflicts.length
          ? `Approved. ${preview.conflicts.length} other booking(s) moved to CONFLICTED. Notify them via the booking detail screens.`
          : "Booking approved."
      );
      router.replace(`/(admin)/bookings/${bookingPublicId}`);
    },
    onError: (e: Error) => Alert.alert("Approve failed", e.message),
  });

  if (bookingQuery.isLoading || previewQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (bookingQuery.error || !booking) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-red-600 text-center">
          {bookingQuery.error instanceof Error
            ? bookingQuery.error.message
            : "Booking not found."}
        </Text>
      </SafeAreaView>
    );
  }

  const conflicts = preview?.conflicts ?? [];
  const hasConflicts = conflicts.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{ headerShown: false, title: "Review & approve" }}
      />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
        <View className="flex-row items-center mb-3">
          <Pressable
            onPress={() => router.back()}
            className="px-2 py-1 rounded bg-gray-200 active:bg-gray-300"
          >
            <Text className="text-sm font-semibold text-gray-700">‹ Back</Text>
          </Pressable>
          <Text className="ml-3 text-sm font-semibold text-gray-700">
            {booking.bookingId} · {booking.name}
          </Text>
        </View>

        <Section
          title="You are about to approve"
          subtitle={`for ${formatDate(booking.date)}`}
        >
          <Text className="text-lg font-extrabold text-gray-900">
            {booking.name}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {booking.bookingId} · {booking.eventType} ·{" "}
            {booking.numberOfAttendees} guests
          </Text>
        </Section>

        <View className="h-3" />

        {hasConflicts ? (
          <Section
            title={`${conflicts.length} conflicting booking(s)`}
            subtitle="These will be moved to CONFLICTED and notified that their date is no longer available."
          >
            {conflicts.map((c) => (
              <View
                key={c.id}
                className="border border-rose-200 bg-rose-50 rounded-xl p-3 mb-2"
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-bold text-rose-900">
                    {c.name}
                  </Text>
                  <StatusBadge status={c.status} />
                </View>
                <Text className="text-xs text-rose-800">
                  {c.bookingId} · {c.eventType} · {c.numberOfAttendees} guests
                </Text>
                <Text className="text-xs text-rose-800 mt-0.5">
                  {c.phone}
                  {c.email ? ` · ${c.email}` : ""}
                </Text>
                {c.quotation ? (
                  <Text className="text-xs text-rose-900 mt-1">
                    Quotation {c.quotation.status} · ₹
                    {c.quotation.totalAmount}
                  </Text>
                ) : null}
                <View className="flex-row gap-2 mt-2">
                  {c.notifyViaWhatsapp && c.phone ? (
                    <View className="px-2 py-0.5 rounded bg-green-100">
                      <Text className="text-[10px] font-bold text-green-800">
                        WhatsApp ok
                      </Text>
                    </View>
                  ) : null}
                  {c.notifyViaEmail && c.email ? (
                    <View className="px-2 py-0.5 rounded bg-blue-100">
                      <Text className="text-[10px] font-bold text-blue-800">
                        Email ok
                      </Text>
                    </View>
                  ) : null}
                  {!c.notifyViaWhatsapp && !c.notifyViaEmail ? (
                    <View className="px-2 py-0.5 rounded bg-gray-200">
                      <Text className="text-[10px] font-bold text-gray-700">
                        No opt-in (still notified as critical)
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </Section>
        ) : (
          <Section title="No conflicts">
            <Text className="text-sm text-gray-700">
              No other bookings are pending or sent on this date. Approving
              is safe.
            </Text>
          </Section>
        )}

        <View className="h-3" />

        <Section title="Amounts" subtitle="Confirm the total and advance before approving.">
          <Text className="text-xs font-semibold text-gray-700 mb-1">Total amount (₹)</Text>
          <TextInput
            value={totalAmount}
            onChangeText={(t) => setTotalAmount(t.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
            placeholder="0"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 mb-3"
          />
          <Text className="text-xs font-semibold text-gray-700 mb-1">Advance received (₹)</Text>
          <TextInput
            value={advanceAmount}
            onChangeText={(t) => setAdvanceAmount(t.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
            placeholder="0"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
          />
        </Section>
        <View className="h-3" />

        <Section title="Admin note (optional)">
          <TextInput
            value={adminNote}
            onChangeText={setAdminNote}
            placeholder="Internal note saved on the booking"
            multiline
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 min-h-[60px]"
          />
        </Section>

        <View className="h-3" />

        <ActionButton
          label={
            hasConflicts
              ? `Approve & cascade ${conflicts.length} conflict(s)`
              : "Approve booking"
          }
          variant="success"
          onPress={() => {
            Alert.alert(
              hasConflicts ? "Approve with cascade?" : "Approve booking?",
              (hasConflicts
                ? `This will mark ${conflicts.length} other booking(s) as CONFLICTED. `
                : "") +
                `Advance: ₹${advanceAmount || 0}. Continue?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Approve",
                  style: "destructive",
                  onPress: () => approveMutation.mutate(),
                },
              ]
            );
          }}
          loading={approveMutation.isPending}
          disabled={!totalAmount}
          fullWidth
        />

        <View className="h-2" />
        <ActionButton
          label="Cancel"
          variant="secondary"
          onPress={() => router.back()}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}
