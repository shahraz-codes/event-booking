import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Stack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import ActionButton from "@/components/ActionButton";
import Section from "@/components/Section";
import { formatINR } from "@/lib/format";
import { renderQuotationHtml } from "@/lib/quotation-pdf";
import { getBooking } from "@/services/bookings";
import {
  createQuotation,
  finalizeQuotation,
  getQuotation,
  sendQuotation,
  updateQuotation,
  type QuotationItemInput,
} from "@/services/quotations";
import { getSiteSettings } from "@/services/site-settings";

interface ItemRow extends QuotationItemInput {
  uid: string;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

function emptyRow(order: number): ItemRow {
  return {
    uid: uid(),
    particular: "",
    quantity: null,
    unit: "",
    rate: null,
    amount: null,
    order,
  };
}

function recomputeAmount(row: ItemRow): ItemRow {
  if (row.quantity != null && row.rate != null) {
    return { ...row, amount: Math.round(row.quantity * row.rate) };
  }
  return row;
}

export default function QuotationEditorScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const bookingPublicId = String(params.id ?? "");

  const [items, setItems] = useState<ItemRow[]>([emptyRow(0)]);
  const [advanceAmount, setAdvanceAmount] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const bookingQuery = useQuery({
    queryKey: ["bookings", "detail", bookingPublicId],
    queryFn: () => getBooking(bookingPublicId),
    enabled: !!bookingPublicId,
  });
  const booking = bookingQuery.data;

  const quotationQuery = useQuery({
    queryKey: ["quotation", booking?.id],
    queryFn: () => getQuotation(booking!.id),
    enabled: !!booking?.id,
  });
  const quotation = quotationQuery.data;

  useEffect(() => {
    if (!quotation) return;
    setItems(
      quotation.items.length
        ? quotation.items.map((it, idx) => ({
            uid: uid(),
            particular: it.particular,
            quantity: it.quantity ?? null,
            unit: it.unit ?? "",
            rate: it.rate ?? null,
            amount: it.amount ?? null,
            order: it.order ?? idx,
          }))
        : [emptyRow(0)]
    );
    setAdvanceAmount(String(quotation.advanceAmount ?? 0));
    setNotes(quotation.notes ?? "");
    setDirty(false);
  }, [quotation?.id]);

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (it.amount ?? 0), 0),
    [items]
  );
  const advanceNum = Number(advanceAmount) || 0;
  const balance = subtotal - advanceNum;

  const isFinalized = quotation?.status === "FINALIZED";
  const readonly = isFinalized;

  function patch(idx: number, partial: Partial<ItemRow>) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = recomputeAmount({ ...next[idx], ...partial });
      return next;
    });
    setDirty(true);
  }

  function addRow() {
    setItems((prev) => [...prev, emptyRow(prev.length)]);
    setDirty(true);
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!booking) throw new Error("Booking not loaded");
      const cleanedItems = items
        .filter((it) => it.particular.trim().length > 0)
        .map((it, idx) => ({
          particular: it.particular.trim(),
          quantity: it.quantity ?? null,
          unit: it.unit ?? null,
          rate: it.rate ?? null,
          amount: it.amount ?? null,
          order: idx,
        }));
      if (cleanedItems.length === 0) {
        throw new Error("At least one item with a particular is required");
      }
      const payload = {
        items: cleanedItems,
        advanceAmount: advanceNum,
        notes: notes || null,
      };
      if (quotation) {
        return updateQuotation({
          quotationId: quotation.id,
          ...payload,
        });
      }
      return createQuotation({
        bookingInternalId: booking.id,
        ...payload,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", booking?.id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      setDirty(false);
      Alert.alert("Saved", "Quotation saved.");
    },
    onError: (e: Error) => Alert.alert("Failed to save", e.message),
  });

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!quotation) throw new Error("Save the quotation first");
      return sendQuotation(quotation.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", booking?.id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      Alert.alert(
        "Sent",
        "Quotation marked as sent. The booking status is now QUOTATION_SENT."
      );
    },
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => {
      if (!quotation) throw new Error("Save the quotation first");
      return finalizeQuotation(quotation.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotation", booking?.id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      Alert.alert(
        "Finalized",
        "Quotation finalized. Booking status is now QUOTATION_FINALIZED."
      );
    },
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  async function exportPdf() {
    if (!booking || !quotation) {
      Alert.alert("Save first", "Save the quotation before exporting a PDF.");
      return;
    }
    setGeneratingPdf(true);
    try {
      let org:
        | {
            addressLine1?: string | null;
            addressLine2?: string | null;
            phone?: string | null;
          }
        | undefined;
      try {
        const settings = await getSiteSettings();
        org = {
          addressLine1: settings.addressLine1,
          addressLine2: settings.addressLine2,
          phone: settings.contactPhone,
        };
      } catch {
        org = undefined;
      }
      const html = renderQuotationHtml({
        booking: {
          bookingId: booking.bookingId,
          name: booking.name,
          phone: booking.phone,
          email: booking.email,
          date: booking.date,
          eventType: booking.eventType,
          numberOfAttendees: booking.numberOfAttendees,
        },
        quotation,
        org,
      });
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Quotation ${booking.bookingId}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Saved", `PDF saved to ${uri}`);
      }
    } catch (e) {
      Alert.alert(
        "Failed to generate PDF",
        e instanceof Error ? e.message : "Unknown error"
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  if (bookingQuery.isLoading || quotationQuery.isLoading) {
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
          Couldn't load the booking.
        </Text>
        <View className="h-3" />
        <ActionButton
          label="Back"
          variant="secondary"
          onPress={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{ headerShown: false, title: "Quotation" }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
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

          {quotation ? (
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
              <Text className="text-xs font-bold text-blue-900">
                Existing quotation · {quotation.status}
              </Text>
              {isFinalized ? (
                <Text className="text-xs text-blue-800 mt-1">
                  Finalized quotations cannot be edited. You can still export
                  the PDF.
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
              <Text className="text-xs text-amber-900">
                No quotation yet. Fill in line items below and Save to create one.
              </Text>
            </View>
          )}

          <Section title="Line items">
            <View className="flex-row pb-2 border-b border-gray-200 mb-2">
              <Text className="w-6 text-xs font-bold text-gray-500">#</Text>
              <Text className="flex-1 text-xs font-bold text-gray-500">
                Particular
              </Text>
              <Text className="w-14 text-xs font-bold text-gray-500 text-right">
                Qty
              </Text>
              <Text className="w-20 text-xs font-bold text-gray-500 text-right">
                Rate
              </Text>
              <Text className="w-6 text-right" />
            </View>

            {items.map((row, idx) => (
              <View key={row.uid} className="mb-2 pb-2 border-b border-gray-100">
                <View className="flex-row items-center">
                  <Text className="w-6 text-xs text-gray-500">{idx + 1}</Text>
                  <TextInput
                    value={row.particular}
                    onChangeText={(t) => patch(idx, { particular: t })}
                    placeholder="e.g. Dinner buffet (veg)"
                    editable={!readonly}
                    className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900"
                  />
                  <TextInput
                    value={row.quantity != null ? String(row.quantity) : ""}
                    onChangeText={(t) =>
                      patch(idx, { quantity: t ? Number(t) : null })
                    }
                    placeholder="0"
                    keyboardType="numeric"
                    editable={!readonly}
                    className="w-14 ml-1 border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 text-right"
                  />
                  <TextInput
                    value={row.rate != null ? String(row.rate) : ""}
                    onChangeText={(t) =>
                      patch(idx, { rate: t ? Number(t) : null })
                    }
                    placeholder="0"
                    keyboardType="numeric"
                    editable={!readonly}
                    className="w-20 ml-1 border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-900 text-right"
                  />
                  {!readonly ? (
                    <Pressable
                      onPress={() => removeRow(idx)}
                      className="w-6 items-center justify-center"
                    >
                      <Text className="text-red-600 font-bold">×</Text>
                    </Pressable>
                  ) : (
                    <View className="w-6" />
                  )}
                </View>
                <View className="flex-row items-center mt-1.5 ml-6">
                  <TextInput
                    value={row.unit ?? ""}
                    onChangeText={(t) => patch(idx, { unit: t })}
                    placeholder="Unit (plate / hour / pkg)"
                    editable={!readonly}
                    className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-xs text-gray-700"
                  />
                  <Text className="ml-2 w-28 text-right text-xs font-bold text-gray-700">
                    {formatINR(row.amount ?? 0)}
                  </Text>
                </View>
              </View>
            ))}

            {!readonly ? (
              <ActionButton
                label="+ Add line item"
                variant="secondary"
                onPress={addRow}
                size="sm"
              />
            ) : null}
          </Section>

          <View className="h-3" />

          <Section title="Totals">
            <View className="flex-row justify-between py-1">
              <Text className="text-sm text-gray-700">Subtotal</Text>
              <Text className="text-sm font-semibold text-gray-900">
                {formatINR(subtotal)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between py-1">
              <Text className="text-sm text-gray-700">Advance</Text>
              <TextInput
                value={advanceAmount}
                onChangeText={(t) => {
                  setAdvanceAmount(t.replace(/[^0-9]/g, ""));
                  setDirty(true);
                }}
                keyboardType="numeric"
                editable={!readonly}
                className="w-28 border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 text-right"
              />
            </View>
            <View className="h-px bg-gray-200 my-2" />
            <View className="flex-row justify-between py-1">
              <Text className="text-base font-bold text-gray-900">
                Balance due
              </Text>
              <Text className="text-base font-bold text-brand-700">
                {formatINR(balance)}
              </Text>
            </View>
          </Section>

          <View className="h-3" />

          <Section title="Notes (optional)">
            <TextInput
              value={notes}
              onChangeText={(t) => {
                setNotes(t);
                setDirty(true);
              }}
              placeholder="Anything you'd like the customer to know..."
              multiline
              editable={!readonly}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 min-h-[80px]"
            />
          </Section>

          <View className="h-3" />

          <Section title="Actions">
            {!readonly ? (
              <View className="gap-2 mb-2">
                <ActionButton
                  label={
                    quotation
                      ? dirty
                        ? "Save changes"
                        : "Save (no changes)"
                      : "Create quotation"
                  }
                  variant="primary"
                  onPress={() => saveMutation.mutate()}
                  loading={saveMutation.isPending}
                  disabled={!dirty && !!quotation}
                  fullWidth
                />
                {quotation && quotation.status === "DRAFT" ? (
                  <ActionButton
                    label="Mark as Sent"
                    variant="secondary"
                    onPress={() => sendMutation.mutate()}
                    loading={sendMutation.isPending}
                    fullWidth
                  />
                ) : null}
                {quotation ? (
                  <ActionButton
                    label="Finalize quotation"
                    variant="success"
                    onPress={() =>
                      Alert.alert(
                        "Finalize quotation?",
                        "Finalized quotations cannot be edited. Continue?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Finalize",
                            style: "destructive",
                            onPress: () => finalizeMutation.mutate(),
                          },
                        ]
                      )
                    }
                    loading={finalizeMutation.isPending}
                    fullWidth
                  />
                ) : null}
              </View>
            ) : null}
            <ActionButton
              label={generatingPdf ? "Generating PDF..." : "Export PDF & share"}
              variant="secondary"
              onPress={exportPdf}
              loading={generatingPdf}
              disabled={!quotation}
              fullWidth
            />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
