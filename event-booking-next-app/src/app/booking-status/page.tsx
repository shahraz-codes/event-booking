"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EVENT_TYPES } from "@/types";
import type { BookingComment } from "@/types";
import { format } from "date-fns";
import DownloadReceipt from "@/components/BookingReceipt";

interface BookingInfo {
  bookingId: string;
  name: string;
  phone: string;
  date: string;
  eventType: string;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  totalAmount: number | null;
  advanceAmount: number | null;
  comments: BookingComment[];
  createdAt: string;
}

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending Review",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    badge: "bg-yellow-100 text-yellow-800",
    icon: (
      <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  APPROVED: {
    label: "Approved",
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    badge: "bg-green-100 text-green-800",
    icon: (
      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  REJECTED: {
    label: "Rejected",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    badge: "bg-red-100 text-red-800",
    icon: (
      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

function BookingStatusContent() {
  const searchParams = useSearchParams();
  const prefilled = searchParams.get("id") || "";

  const [bookingId, setBookingId] = useState(prefilled);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commentInput, setCommentInput] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchStatus = async (id: string) => {
    setLoading(true);
    setError(null);
    setBooking(null);

    try {
      const res = await fetch(`/api/bookings/status?bookingId=${encodeURIComponent(id)}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || "Booking not found");
        return;
      }

      setBooking(json.data);
    } catch {
      setError("Failed to fetch status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (prefilled) {
      fetchStatus(prefilled);
    }
  }, [prefilled]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (bookingId.trim()) {
      fetchStatus(bookingId.trim());
    }
  };

  const handleSendComment = async () => {
    const msg = commentInput.trim();
    if (!msg || !booking) return;

    setCommentLoading(true);
    try {
      const res = await fetch("/api/bookings/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          phone: booking.phone,
          message: msg,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCommentInput("");
        fetchStatus(booking.bookingId);
      }
    } catch {
      /* noop */
    } finally {
      setCommentLoading(false);
    }
  };

  const eventLabel = (val: string) =>
    EVENT_TYPES.find((t) => t.value === val)?.label || val;

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <div className="mb-10 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-amber-600">
          Track Your Request
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Booking Status</h1>
        <p className="mt-2 text-gray-600">
          Enter your Booking ID to check the status
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 flex gap-3">
        <input
          type="text"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          placeholder="e.g. BNQ-2026-0001"
          className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-mono text-gray-900 placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        />
        <button
          type="submit"
          disabled={loading || !bookingId.trim()}
          className="rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
          ) : (
            "Search"
          )}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {booking && (
        <div className="space-y-4">
          <div className={`rounded-2xl border ${STATUS_CONFIG[booking.status].border} ${STATUS_CONFIG[booking.status].bg} p-6`}>
            <div className="mb-4 flex items-center gap-3">
              {STATUS_CONFIG[booking.status].icon}
              <div>
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CONFIG[booking.status].badge}`}>
                  {STATUS_CONFIG[booking.status].label}
                </span>
              </div>
            </div>

            <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
              <Row label="Booking ID" value={booking.bookingId} mono />
              <Row label="Name" value={booking.name} />
              <Row label="Event" value={eventLabel(booking.eventType)} />
              <Row
                label="Date"
                value={format(new Date(booking.date), "EEEE, MMMM d, yyyy")}
              />
              <Row
                label="Submitted"
                value={format(new Date(booking.createdAt), "MMM d, yyyy h:mm a")}
              />
              {booking.adminNote && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-500">Admin Note</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {booking.adminNote}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary for Approved Bookings */}
          {booking.status === "APPROVED" && booking.totalAmount != null && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <h3 className="mb-3 text-sm font-semibold text-green-900">
                Payment Summary
              </h3>
              <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Amount</span>
                  <span className="font-semibold text-gray-900">
                    &#8377;{booking.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Advance Received</span>
                  <span className="font-semibold text-gray-900">
                    &#8377;{(booking.advanceAmount ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 text-sm">
                  <span className="font-medium text-gray-700">Balance Due</span>
                  <span className="font-bold text-amber-800">
                    &#8377;{(booking.totalAmount - (booking.advanceAmount ?? 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <DownloadReceipt booking={booking} />
              </div>
            </div>
          )}

          {/* Discussion Thread */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Discussion
            </h3>

            <div className="mb-4 max-h-72 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
              {booking.comments.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400">
                  No messages yet. Start a conversation with the admin.
                </p>
              ) : (
                booking.comments.map((c) => (
                  <div
                    key={c.id}
                    className={`flex ${c.sender === "CUSTOMER" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        c.sender === "CUSTOMER"
                          ? "bg-amber-600 text-white"
                          : "bg-white text-gray-800 shadow-sm"
                      }`}
                    >
                      <p className="text-xs font-medium opacity-75 mb-0.5">
                        {c.sender === "CUSTOMER" ? "You" : "Admin"}
                      </p>
                      <p>{c.message}</p>
                      <p className="mt-1 text-[10px] opacity-60">
                        {format(new Date(c.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
              />
              <button
                onClick={handleSendComment}
                disabled={commentLoading || !commentInput.trim()}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
              >
                {commentLoading ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-gray-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default function BookingStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
        </div>
      }
    >
      <BookingStatusContent />
    </Suspense>
  );
}
