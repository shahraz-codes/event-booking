import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Link,
  Stack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ActionButton from "@/components/ActionButton";
import BookingDateDisplay from "@/components/BookingDateDisplay";
import Section from "@/components/Section";
import StatusBadge from "@/components/StatusBadge";
import WhatsAppNotifyButton from "@/components/WhatsAppNotifyButton";
import { useRealtimeComments } from "@/hooks/useRealtimeComments";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import type {
  AdminBookingAction,
  BookingStatus,
} from "@/lib/types";
import type { NotificationEventType } from "@/lib/notification-channel";
import {
  getBooking,
  performAdminAction,
  type AdminActionPayload,
} from "@/services/bookings";
import {
  listCommentsForBooking,
  postAdminComment,
} from "@/services/comments";

const PRE_APPROVE_STATUSES: BookingStatus[] = [
  "PENDING",
  "QUOTATION_SENT",
  "QUOTATION_FINALIZED",
];

function pickEventForStatus(
  next: BookingStatus
): NotificationEventType | null {
  switch (next) {
    case "APPROVED":
      return "booking.approved";
    case "REJECTED":
      return "booking.rejected";
    case "CANCELLED":
      return "booking.cancelled_by_admin";
    default:
      return null;
  }
}

export default function BookingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const bookingId = String(params.id ?? "");

  const [adminNote, setAdminNote] = useState("");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");

  const {
    data: booking,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ["bookings", "detail", bookingId],
    queryFn: () => getBooking(bookingId),
    enabled: !!bookingId,
  });

  useRealtimeComments(booking?.id ?? null);

  const { data: comments, error: commentsError } = useQuery({
    queryKey: ["comments", booking?.id],
    queryFn: () => listCommentsForBooking(booking!.id),
    enabled: !!booking?.id,
  });

  const actionMutation = useMutation({
    mutationFn: (payload: AdminActionPayload) => performAdminAction(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      Alert.alert("Done", "Booking updated.");
      setAdminNote("");
      setReason("");
    },
    onError: (err: Error) => {
      Alert.alert("Action failed", err.message);
    },
  });

  const commentMutation = useMutation({
    mutationFn: (msg: string) => postAdminComment(bookingId, msg),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["comments", booking?.id] });
    },
    onError: (err: Error) => Alert.alert("Failed", err.message),
  });

  function confirmAction(
    action: AdminBookingAction,
    label: string,
    extras: Partial<AdminActionPayload> = {},
    options: { destructive?: boolean } = {}
  ) {
    Alert.alert(label, `${label} for ${bookingId}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        style: options.destructive ? "destructive" : "default",
        onPress: () =>
          actionMutation.mutate({
            bookingId,
            action,
            adminNote: adminNote || undefined,
            reason: reason || undefined,
            ...extras,
          }),
      },
    ]);
  }

  if (!bookingId) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text>Invalid booking id.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-red-600 text-center">
          {error instanceof Error
            ? error.message
            : "Booking not found or you don't have access."}
        </Text>
        <View className="h-3" />
        <ActionButton
          label="Back to bookings"
          variant="secondary"
          onPress={() => router.replace("/(admin)")}
        />
      </SafeAreaView>
    );
  }

  const canPreApprove = PRE_APPROVE_STATUSES.includes(booking.status);
  const eventForStatus = pickEventForStatus(booking.status);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{ headerShown: false, title: booking.bookingId }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
            />
          }
        >
          <View className="flex-row items-center mb-3">
            <Pressable
              onPress={() => router.back()}
              className="px-2 py-1 rounded bg-gray-200 active:bg-gray-300"
            >
              <Text className="text-sm font-semibold text-gray-700">‹ Back</Text>
            </Pressable>
            <Text className="ml-3 text-xs text-gray-500">
              Created {formatDateTime(booking.createdAt)}
            </Text>
          </View>

          <Section title="Customer">
            <Text className="text-xl font-extrabold text-gray-900">
              {booking.name}
            </Text>
            <Text className="text-sm text-gray-700 mt-1">{booking.phone}</Text>
            {booking.email ? (
              <Text className="text-sm text-gray-700 mt-1">
                {booking.email}
              </Text>
            ) : null}
            <View className="flex-row gap-2 mt-3">
              <Pressable
                className="px-3 py-2 rounded-lg bg-blue-100 active:bg-blue-200"
                onPress={() => Linking.openURL(`tel:${booking.phone}`)}
              >
                <Text className="text-xs font-bold text-blue-800">📞 Call</Text>
              </Pressable>
              <Pressable
                className="px-3 py-2 rounded-lg bg-green-100 active:bg-green-200"
                onPress={() =>
                  Linking.openURL(
                    `https://wa.me/${booking.phone.replace(/[^\d]/g, "")}`
                  )
                }
              >
                <Text className="text-xs font-bold text-green-800">
                  💬 WhatsApp
                </Text>
              </Pressable>
            </View>
          </Section>

          <View className="h-3" />

          <Section title="Booking">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900">
                  {booking.bookingId}
                </Text>
                <View className="mt-1">
                  <BookingDateDisplay
                    date={booking.date}
                    previousDate={booking.previousDate}
                    requestedNewDate={booking.requestedNewDate}
                    size="md"
                  />
                </View>
              </View>
              <StatusBadge status={booking.status} size="md" />
            </View>

            <View className="flex-row gap-6 mt-3">
              <View>
                <Text className="text-xs uppercase text-gray-500">Event</Text>
                <Text className="text-sm font-semibold text-gray-900 mt-0.5">
                  {booking.eventType}
                </Text>
              </View>
              <View>
                <Text className="text-xs uppercase text-gray-500">Guests</Text>
                <Text className="text-sm font-semibold text-gray-900 mt-0.5">
                  {booking.numberOfAttendees}
                </Text>
              </View>
              <View>
                <Text className="text-xs uppercase text-gray-500">Total</Text>
                <Text className="text-sm font-semibold text-gray-900 mt-0.5">
                  {formatINR(booking.totalAmount)}
                </Text>
              </View>
            </View>

            {booking.notes ? (
              <View className="mt-3 bg-gray-50 rounded-lg p-3">
                <Text className="text-xs uppercase text-gray-500">Notes</Text>
                <Text className="text-sm text-gray-700 mt-1">
                  {booking.notes}
                </Text>
              </View>
            ) : null}

            <View className="mt-3">
              <Text className="text-xs text-gray-500">
                Notifications:{" "}
                {booking.notifyViaWhatsapp ? "WhatsApp" : "—"}
                {booking.notifyViaEmail
                  ? booking.notifyViaWhatsapp
                    ? " + Email"
                    : "Email"
                  : ""}
              </Text>
            </View>
          </Section>

          <View className="h-3" />
          <Section
            title="Quotation"
            subtitle="Open the quotation editor and share the PDF with the customer."
          >
            <Link
              href={`/(admin)/bookings/${bookingId}/quotation`}
              asChild
            >
              <ActionButton
                label="Open quotation editor"
                variant="secondary"
                onPress={() => {}}
                fullWidth
              />
            </Link>
          </Section>

          {booking.status === "CANCELLATION_REQUESTED" ? (
            <>
              <View className="h-3" />
              <Section
                title="Cancellation request"
                subtitle="Customer asked to cancel this approved booking."
              >
                {booking.cancellationReason ? (
                  <Text className="text-sm text-gray-700 mb-3">
                    Reason: {booking.cancellationReason}
                  </Text>
                ) : null}
                <View className="gap-2">
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Optional admin note / decline reason"
                    multiline
                    className="border border-gray-300 rounded-lg p-3 text-sm text-gray-900 min-h-[60px]"
                  />
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <ActionButton
                        label="Approve cancellation"
                        variant="success"
                        onPress={() =>
                          confirmAction(
                            "approveCancellation",
                            "Approve cancellation"
                          )
                        }
                        loading={actionMutation.isPending}
                        fullWidth
                      />
                    </View>
                    <View className="flex-1">
                      <ActionButton
                        label="Decline"
                        variant="danger"
                        onPress={() =>
                          confirmAction(
                            "declineCancellation",
                            "Decline cancellation",
                            {},
                            { destructive: true }
                          )
                        }
                        loading={actionMutation.isPending}
                        fullWidth
                      />
                    </View>
                  </View>
                </View>
              </Section>
            </>
          ) : null}

          {booking.status === "DATE_CHANGE_REQUESTED" ? (
            <>
              <View className="h-3" />
              <Section
                title="Date change request"
                subtitle="Customer asked to change the date for this approved booking."
              >
                {booking.requestedNewDate ? (
                  <Text className="text-sm text-gray-700 mb-1">
                    New date requested:{" "}
                    <Text className="font-semibold">
                      {formatDate(booking.requestedNewDate)}
                    </Text>
                  </Text>
                ) : null}
                {booking.dateChangeReason ? (
                  <Text className="text-sm text-gray-700 mb-3">
                    Reason: {booking.dateChangeReason}
                  </Text>
                ) : null}
                <View className="gap-2">
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Optional admin note / decline reason"
                    multiline
                    className="border border-gray-300 rounded-lg p-3 text-sm text-gray-900 min-h-[60px]"
                  />
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <ActionButton
                        label="Approve new date"
                        variant="success"
                        onPress={() =>
                          confirmAction(
                            "approveDateChange",
                            "Approve new date"
                          )
                        }
                        loading={actionMutation.isPending}
                        fullWidth
                      />
                    </View>
                    <View className="flex-1">
                      <ActionButton
                        label="Decline"
                        variant="danger"
                        onPress={() =>
                          confirmAction(
                            "declineDateChange",
                            "Decline date change",
                            {},
                            { destructive: true }
                          )
                        }
                        loading={actionMutation.isPending}
                        fullWidth
                      />
                    </View>
                  </View>
                </View>
              </Section>
            </>
          ) : null}

          {booking.status === "CONFLICTED" ? (
            <>
              <View className="h-3" />
              <Section
                title="Date conflict"
                subtitle="Another booking on this date was approved."
              >
                {booking.conflictingBookingId ? (
                  <Text className="text-sm text-gray-700">
                    Winner booking:{" "}
                    <Text className="font-semibold">
                      {booking.conflictingBookingId}
                    </Text>
                  </Text>
                ) : null}
                <View className="h-2" />
                <ActionButton
                  label="Force resolve (close conflict)"
                  variant="secondary"
                  onPress={() =>
                    confirmAction(
                      "forceResolveConflict",
                      "Force resolve conflict"
                    )
                  }
                  loading={actionMutation.isPending}
                  fullWidth
                />
              </Section>
            </>
          ) : null}

          {!booking.dateChangeAcknowledged ? (
            <>
              <View className="h-3" />
              <Section title="Date change unacknowledged">
                <Text className="text-sm text-gray-700 mb-2">
                  This booking's date was changed by the customer. Re-issue
                  quotation if needed, then acknowledge.
                </Text>
                <ActionButton
                  label="Acknowledge new date"
                  variant="primary"
                  onPress={() =>
                    confirmAction(
                      "acknowledgeDateChange",
                      "Acknowledge new date"
                    )
                  }
                  loading={actionMutation.isPending}
                  fullWidth
                />
              </Section>
            </>
          ) : null}

          {canPreApprove ? (
            <>
              <View className="h-3" />
              <Section
                title="Admin decision"
                subtitle="Review conflicts before approving to avoid cascading other customers."
              >
                <TextInput
                  value={adminNote}
                  onChangeText={setAdminNote}
                  placeholder="Optional admin note"
                  multiline
                  className="border border-gray-300 rounded-lg p-3 text-sm text-gray-900 min-h-[60px] mb-2"
                />
                <View className="gap-2">
                  <Link
                    href={`/(admin)/bookings/${bookingId}/approve-review`}
                    asChild
                  >
                    <ActionButton
                      label="Review conflicts & approve"
                      variant="success"
                      onPress={() => {}}
                      fullWidth
                    />
                  </Link>
                  <ActionButton
                    label="Reject booking"
                    variant="danger"
                    onPress={() =>
                      confirmAction("reject", "Reject booking", {}, {
                        destructive: true,
                      })
                    }
                    loading={actionMutation.isPending}
                    fullWidth
                  />
                </View>
              </Section>
            </>
          ) : null}

          {booking.status === "APPROVED" ? (
            <>
              <View className="h-3" />
              <Section title="Cancel approved booking">
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Cancellation reason (sent to customer)"
                  multiline
                  className="border border-gray-300 rounded-lg p-3 text-sm text-gray-900 min-h-[60px] mb-2"
                />
                <ActionButton
                  label="Cancel booking"
                  variant="danger"
                  onPress={() =>
                    confirmAction("cancel", "Cancel booking", {}, {
                      destructive: true,
                    })
                  }
                  loading={actionMutation.isPending}
                  fullWidth
                />
              </Section>
            </>
          ) : null}

          {eventForStatus ? (
            <>
              <View className="h-3" />
              <Section title="Notify customer">
                <WhatsAppNotifyButton
                  booking={{
                    name: booking.name,
                    bookingId: booking.bookingId,
                    date: booking.date,
                    phone: booking.phone,
                    email: booking.email,
                    notifyViaEmail: booking.notifyViaEmail,
                    notifyViaWhatsapp: booking.notifyViaWhatsapp,
                  }}
                  event={eventForStatus}
                  amount={formatINR(booking.totalAmount)}
                  variant="block"
                />
                <Text className="text-xs text-gray-500 mt-2">
                  Opens WhatsApp with a pre-filled message. Critical events
                  (cancelled by admin, conflicts) also notify via email when
                  available.
                </Text>
              </Section>
            </>
          ) : null}

          <View className="h-3" />

          <Section title="Discussion" subtitle="Live updates via Supabase.">
            {commentsError ? (
              <Text className="text-xs text-red-600">
                Couldn&apos;t load messages. Pull down to refresh.
              </Text>
            ) : !comments || comments.length === 0 ? (
              <Text className="text-sm text-gray-500 italic">
                No messages yet.
              </Text>
            ) : (
              <View>
                {comments.map((c) => (
                  <View
                    key={c.id}
                    className={`p-3 mb-2 rounded-lg ${
                      c.sender === "ADMIN" ? "bg-brand-50" : "bg-gray-100"
                    }`}
                  >
                    <Text className="text-xs font-bold text-gray-500 mb-1">
                      {c.sender} • {formatDateTime(c.createdAt)}
                    </Text>
                    <Text className="text-sm text-gray-800">{c.message}</Text>
                  </View>
                ))}
              </View>
            )}

            <View className="h-2" />
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Reply to customer..."
              multiline
              className="border border-gray-300 rounded-lg p-3 text-sm text-gray-900 min-h-[70px]"
            />
            <View className="h-2" />
            <ActionButton
              label="Send reply"
              variant="primary"
              onPress={() => {
                if (!comment.trim()) return;
                commentMutation.mutate(comment.trim());
              }}
              loading={commentMutation.isPending}
              disabled={!comment.trim()}
              fullWidth
            />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
