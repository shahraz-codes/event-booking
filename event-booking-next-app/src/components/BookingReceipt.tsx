"use client";

import { useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import type { QuotationData } from "@/types";

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  reception: "Reception",
  birthday: "Birthday Party",
  corporate: "Corporate Event",
  engagement: "Engagement Ceremony",
  other: "Other",
};

interface ReceiptBooking {
  bookingId: string;
  name: string;
  phone: string;
  date: string;
  eventType: string;
  numberOfAttendees?: number;
  totalAmount: number | null;
  advanceAmount: number | null;
  createdAt: string;
  quotation?: QuotationData;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1f2937",
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#d97706",
    paddingBottom: 15,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
  },
  receiptLabel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
    marginBottom: 20,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  label: {
    color: "#6b7280",
    width: "40%",
  },
  value: {
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    width: "60%",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#d97706",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  colNum: { width: "8%" },
  colParticular: { width: "62%" },
  colAmount: { width: "30%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: "#d97706",
    marginTop: 4,
  },
  totalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
});

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function ReceiptDocument({ booking }: { booking: ReceiptBooking }) {
  const total = booking.totalAmount ?? 0;
  const advance = booking.advanceAmount ?? 0;
  const balance = total - advance;
  const hasQuotationItems =
    booking.quotation && booking.quotation.items.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>AR Banquets</Text>
          <Text style={styles.subtitle}>
            9-4-86/227, AR Center, 5th &amp; 6th Floor, Tolichowki Road,
            Hyderabad, Telangana 500008
          </Text>
        </View>

        <Text style={styles.receiptLabel}>BOOKING RECEIPT</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Booking ID</Text>
            <Text style={styles.value}>{booking.bookingId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Customer Name</Text>
            <Text style={styles.value}>{booking.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{booking.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Event Type</Text>
            <Text style={styles.value}>
              {EVENT_TYPE_LABELS[booking.eventType] || booking.eventType}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Event Date</Text>
            <Text style={styles.value}>
              {format(new Date(booking.date), "EEEE, MMMM d, yyyy")}
            </Text>
          </View>
          {booking.numberOfAttendees != null &&
            booking.numberOfAttendees > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Number of Guests</Text>
                <Text style={styles.value}>
                  {booking.numberOfAttendees}
                </Text>
              </View>
            )}
          <View style={styles.row}>
            <Text style={styles.label}>Booking Date</Text>
            <Text style={styles.value}>
              {format(new Date(booking.createdAt), "MMMM d, yyyy")}
            </Text>
          </View>
        </View>

        {hasQuotationItems && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Package Breakdown</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
              <Text style={[styles.tableHeaderCell, styles.colParticular]}>
                Particular
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.colAmount,
                  { textAlign: "right" },
                ]}
              >
                Amount
              </Text>
            </View>
            {booking.quotation!.items.map((item, idx) => (
              <View key={item.id || idx} style={styles.tableRow}>
                <Text style={[{ fontSize: 10 }, styles.colNum]}>
                  {idx + 1}
                </Text>
                <Text style={[{ fontSize: 10 }, styles.colParticular]}>
                  {item.particular}
                  {item.quantity && item.unit
                    ? ` (${item.quantity} ${item.unit})`
                    : ""}
                </Text>
                <Text
                  style={[
                    { fontSize: 10, fontFamily: "Helvetica-Bold" },
                    styles.colAmount,
                  ]}
                >
                  {formatCurrency(item.amount || 0)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Amount</Text>
            <Text style={styles.value}>{formatCurrency(total)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Advance Received</Text>
            <Text style={styles.value}>{formatCurrency(advance)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Balance Due</Text>
            <Text style={styles.totalValue}>{formatCurrency(balance)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Receipt Generated</Text>
            <Text style={styles.value}>
              {format(new Date(), "MMMM d, yyyy h:mm a")}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a computer-generated receipt. For queries, contact AR
          Banquets.
        </Text>
      </Page>
    </Document>
  );
}

export default function DownloadReceipt({
  booking,
}: {
  booking: ReceiptBooking;
}) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(<ReceiptDocument booking={booking} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${booking.bookingId}-receipt.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 disabled:opacity-50"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {generating ? "Generating..." : "Download Receipt"}
    </button>
  );
}
