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
import { APP_NAME } from "@/lib/config";

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  reception: "Reception",
  birthday: "Birthday Party",
  corporate: "Corporate Event",
  engagement: "Engagement Ceremony",
  other: "Other",
};

interface QuotationBooking {
  bookingId: string;
  name: string;
  phone: string;
  date: string;
  eventType: string;
  numberOfAttendees: number;
  createdAt: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1f2937",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#d97706",
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 9,
    color: "#6b7280",
  },
  docLabel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: {
    color: "#6b7280",
    width: "40%",
    fontSize: 10,
  },
  infoValue: {
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    width: "60%",
    fontSize: 10,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 8,
    paddingBottom: 3,
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
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  colNum: { width: "8%" },
  colParticular: { width: "62%" },
  colAmount: { width: "30%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: "#d97706",
    marginTop: 4,
  },
  totalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    width: "70%",
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    width: "30%",
    textAlign: "right",
  },
  summaryRow: {
    flexDirection: "row",
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#6b7280",
    width: "70%",
  },
  summaryValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    width: "30%",
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
});

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function QuotationDocument({
  booking,
  quotation,
}: {
  booking: QuotationBooking;
  quotation: QuotationData;
}) {
  const balance = quotation.totalAmount - quotation.advanceAmount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>
            9-4-86/227, AR Center, 5th &amp; 6th Floor, Tolichowki Road,
            Hyderabad, Telangana 500008
          </Text>
          <Text style={styles.subtitle}>
            Phone: +91 7075751754 | Email: arbanqeuts@gmail.com
          </Text>
        </View>

        <Text style={styles.docLabel}>QUOTATION</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Booking ID</Text>
            <Text style={styles.infoValue}>{booking.bookingId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer Name</Text>
            <Text style={styles.infoValue}>{booking.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{booking.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Event Type</Text>
            <Text style={styles.infoValue}>
              {EVENT_TYPE_LABELS[booking.eventType] || booking.eventType}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Event Date</Text>
            <Text style={styles.infoValue}>
              {format(new Date(booking.date), "EEEE, MMMM d, yyyy")}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Number of Guests</Text>
            <Text style={styles.infoValue}>{booking.numberOfAttendees}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Quotation Date</Text>
            <Text style={styles.infoValue}>
              {format(new Date(), "MMMM d, yyyy")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Details</Text>
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
          {quotation.items.map((item, idx) => (
            <View key={item.id || idx} style={styles.tableRow}>
              <Text style={[{ fontSize: 10 }, styles.colNum]}>{idx + 1}</Text>
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
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(quotation.totalAmount)}
            </Text>
          </View>
          {quotation.advanceAmount > 0 && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Advance</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(quotation.advanceAmount)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text
                  style={[
                    styles.summaryLabel,
                    { fontFamily: "Helvetica-Bold", color: "#92400e" },
                  ]}
                >
                  Balance
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: "#92400e" },
                  ]}
                >
                  {formatCurrency(balance)}
                </Text>
              </View>
            </>
          )}
        </View>

        {quotation.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 10, color: "#4b5563" }}>
              {quotation.notes}
            </Text>
          </View>
        )}

        <Text style={styles.footer}>
          This is a computer-generated quotation from {APP_NAME}. For queries,
          contact us at +91 7075751754.
        </Text>
      </Page>
    </Document>
  );
}

export default function DownloadQuotation({
  booking,
  quotation,
}: {
  booking: QuotationBooking;
  quotation: QuotationData;
}) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(
        <QuotationDocument booking={booking} quotation={quotation} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${booking.bookingId}-quotation.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate quotation PDF:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:opacity-50"
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
      {generating ? "Generating..." : "Download Quotation"}
    </button>
  );
}
