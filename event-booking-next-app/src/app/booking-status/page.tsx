"use client";

import { Fragment, useState, FormEvent, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EVENT_TYPES, BOOKING_STATUS_LABELS } from "@/types";
import type { BookingComment, QuotationData, BookingStatus } from "@/types";
import { format } from "date-fns";
import DownloadReceipt from "@/components/BookingReceipt";
import DownloadQuotation from "@/components/QuotationPDF";

interface BookingBasic {
  bookingId: string;
  name: string;
  date: string;
  eventType: string;
  numberOfAttendees: number;
  status: BookingStatus;
  adminNote: string | null;
  createdAt: string;
}

interface BookingFull extends BookingBasic {
  phone: string;
  notes: string | null;
  totalAmount: number | null;
  advanceAmount: number | null;
  comments: BookingComment[];
  quotation?: QuotationData | null;
}

const STATUS_CONFIG: Record<
  BookingStatus,
  {
    bg: string;
    border: string;
    text: string;
    badge: string;
    icon: React.ReactNode;
  }
> = {
  PENDING: {
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
  QUOTATION_SENT: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    badge: "bg-blue-100 text-blue-800",
    icon: (
      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  QUOTATION_FINALIZED: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-800",
    badge: "bg-indigo-100 text-indigo-800",
    icon: (
      <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  APPROVED: {
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

const PROGRESS_STEPS: { status: BookingStatus; label: string }[] = [
  { status: "PENDING", label: "Submitted" },
  { status: "QUOTATION_SENT", label: "Quotation" },
  { status: "QUOTATION_FINALIZED", label: "Finalized" },
  { status: "APPROVED", label: "Approved" },
];

function getProgressIndex(status: BookingStatus): number {
  if (status === "REJECTED") return -1;
  return PROGRESS_STEPS.findIndex((s) => s.status === status);
}

function BookingStatusContent() {
  const searchParams = useSearchParams();
  const prefilled = searchParams.get("id") || "";

  const [bookingId, setBookingId] = useState(prefilled);
  const [booking, setBooking] = useState<BookingBasic | BookingFull | null>(null);
  const [accessLevel, setAccessLevel] = useState<"basic" | "full">("basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [secretCode, setSecretCode] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [commentInput, setCommentInput] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchStatus = async (id: string, code?: string) => {
    setLoading(true);
    setError(null);
    setBooking(null);
    setAccessLevel("basic");

    try {
      let url = `/api/bookings/status?bookingId=${encodeURIComponent(id)}`;
      if (code) url += `&secretCode=${encodeURIComponent(code)}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || "Booking not found");
        return;
      }

      setBooking(json.data);
      setAccessLevel(json.accessLevel || "basic");
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
      setSecretCode("");
      setUnlockError(null);
      fetchStatus(bookingId.trim());
    }
  };

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!secretCode.trim() || !booking) return;

    setUnlocking(true);
    setUnlockError(null);

    try {
      const url = `/api/bookings/status?bookingId=${encodeURIComponent(
        booking.bookingId
      )}&secretCode=${encodeURIComponent(secretCode.trim())}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!json.success) {
        setUnlockError("Invalid secret code");
        return;
      }

      setBooking(json.data);
      setAccessLevel("full");
    } catch {
      setUnlockError("Failed to verify. Try again.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleSendComment = async () => {
    const msg = commentInput.trim();
    if (!msg || !booking || accessLevel !== "full") return;

    setCommentLoading(true);
    try {
      const res = await fetch("/api/bookings/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          secretCode: secretCode.trim(),
          message: msg,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCommentInput("");
        fetchStatus(booking.bookingId, secretCode.trim());
      }
    } catch {
      /* noop */
    } finally {
      setCommentLoading(false);
    }
  };

  const eventLabel = (val: string) =>
    EVENT_TYPES.find((t) => t.value === val)?.label || val;

  const fullBooking = accessLevel === "full" ? (booking as BookingFull) : null;
  const progressIdx = booking ? getProgressIndex(booking.status) : -1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 text-center sm:mb-10">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-amber-600">
          Track Your Request
        </p>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Booking Status
        </h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-base">
          Enter your Booking ID to check the status
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 flex gap-2 sm:gap-3">
        <input
          type="text"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          placeholder="e.g. BNQ-2026-0001"
          className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-3 text-sm font-mono text-gray-900 placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 sm:px-4"
        />
        <button
          type="submit"
          disabled={loading || !bookingId.trim()}
          className="shrink-0 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50 sm:px-6"
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
          {/* Progress Tracker */}
          {booking.status !== "REJECTED" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Booking Progress
              </h3>
              <div className="mx-auto flex w-full max-w-md items-start">
                {PROGRESS_STEPS.map((step, idx) => {
                  const isLast = idx === PROGRESS_STEPS.length - 1;
                  const isReached = idx <= progressIdx;
                  const isCompleted =
                    idx < progressIdx || (isLast && isReached);
                  return (
                    <Fragment key={step.status}>
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            isReached
                              ? "bg-amber-600 text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {isCompleted ? (
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span
                          className={`mt-1 text-[10px] font-medium ${
                            isReached ? "text-amber-800" : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {!isLast && (
                        <div
                          className={`mx-1 mt-[15px] h-0.5 flex-1 ${
                            idx < progressIdx ? "bg-amber-600" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status Card */}
          <div className={`rounded-2xl border ${STATUS_CONFIG[booking.status].border} ${STATUS_CONFIG[booking.status].bg} p-4 sm:p-6`}>
            <div className="mb-4 flex items-center gap-3">
              {STATUS_CONFIG[booking.status].icon}
              <div>
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CONFIG[booking.status].badge}`}>
                  {BOOKING_STATUS_LABELS[booking.status]}
                </span>
              </div>
            </div>

            <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
              <Row label="Booking ID" value={booking.bookingId} mono />
              <Row label="Name" value={booking.name} />
              <Row label="Event" value={eventLabel(booking.eventType)} />
              <Row label="Attendees" value={String(booking.numberOfAttendees)} />
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

          {/* Unlock Section (when basic access) */}
          {accessLevel === "basic" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-sm font-semibold text-amber-900">
                  Unlock Full Access
                </h3>
              </div>
              <p className="mb-3 text-xs text-amber-800">
                Enter your secret code to access quotation details, discussion, and bill download.
              </p>
              <form onSubmit={handleUnlock} className="flex gap-2">
                <input
                  type="text"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                  placeholder="Enter secret code"
                  maxLength={6}
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-center font-mono text-sm font-bold tracking-widest text-amber-900 placeholder-amber-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
                <button
                  type="submit"
                  disabled={unlocking || secretCode.trim().length === 0}
                  className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                >
                  {unlocking ? "..." : "Unlock"}
                </button>
              </form>
              {unlockError && (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {unlockError}
                </p>
              )}
            </div>
          )}

          {/* Quotation (full access only) */}
          {fullBooking?.quotation && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-900">
                  Quotation
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    fullBooking.quotation.status === "FINALIZED"
                      ? "bg-green-100 text-green-800"
                      : fullBooking.quotation.status === "SENT"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {fullBooking.quotation.status}
                </span>
              </div>
              <div className="rounded-xl bg-white shadow-sm">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="w-8 px-2 py-2 text-left font-medium text-gray-600 sm:px-4">
                        #
                      </th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 sm:px-4">
                        Particular
                      </th>
                      <th className="px-2 py-2 text-right font-medium text-gray-600 sm:px-4">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullBooking.quotation.items.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className="border-b border-gray-50"
                      >
                        <td className="px-2 py-2 align-top text-gray-400 sm:px-4">{idx + 1}</td>
                        <td className="break-words px-2 py-2 text-gray-800 sm:px-4">
                          {item.particular}
                          {item.quantity && item.unit && (
                            <span className="ml-1 text-xs text-gray-500">
                              ({item.quantity} {item.unit})
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right align-top font-medium text-gray-900 sm:px-4">
                          {item.amount ? `₹${item.amount.toLocaleString("en-IN")}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={2} className="px-2 py-2 font-semibold text-gray-900 sm:px-4">
                        Total
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-bold text-gray-900 sm:px-4">
                        &#8377;{fullBooking.quotation.totalAmount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    {fullBooking.quotation.advanceAmount > 0 && (
                      <>
                        <tr>
                          <td colSpan={2} className="px-2 py-1 text-gray-600 sm:px-4">
                            Advance
                          </td>
                          <td className="whitespace-nowrap px-2 py-1 text-right font-medium text-gray-700 sm:px-4">
                            &#8377;{fullBooking.quotation.advanceAmount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="px-2 py-1 font-semibold text-amber-800 sm:px-4">
                            Balance
                          </td>
                          <td className="whitespace-nowrap px-2 py-1 text-right font-bold text-amber-800 sm:px-4">
                            &#8377;
                            {(
                              fullBooking.quotation.totalAmount -
                              fullBooking.quotation.advanceAmount
                            ).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>
              </div>
              {fullBooking.quotation.notes && (
                <p className="mt-3 text-xs text-blue-800">
                  <span className="font-medium">Note:</span>{" "}
                  {fullBooking.quotation.notes}
                </p>
              )}
              <div className="mt-4">
                <DownloadQuotation
                  booking={{
                    bookingId: fullBooking.bookingId,
                    name: fullBooking.name,
                    phone: fullBooking.phone,
                    date: fullBooking.date,
                    eventType: fullBooking.eventType,
                    numberOfAttendees: fullBooking.numberOfAttendees,
                    createdAt: fullBooking.createdAt,
                  }}
                  quotation={fullBooking.quotation}
                />
              </div>
            </div>
          )}

          {/* Payment Summary for Approved Bookings (full access only) */}
          {fullBooking &&
            fullBooking.status === "APPROVED" &&
            fullBooking.totalAmount != null && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 sm:p-6">
                <h3 className="mb-3 text-sm font-semibold text-green-900">
                  Payment Summary
                </h3>
                <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Amount</span>
                    <span className="font-semibold text-gray-900">
                      &#8377;{fullBooking.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Advance Received</span>
                    <span className="font-semibold text-gray-900">
                      &#8377;{(fullBooking.advanceAmount ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-sm">
                    <span className="font-medium text-gray-700">Balance Due</span>
                    <span className="font-bold text-amber-800">
                      &#8377;
                      {(
                        fullBooking.totalAmount -
                        (fullBooking.advanceAmount ?? 0)
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <DownloadReceipt
                    booking={{
                      ...fullBooking,
                      quotation: fullBooking.quotation ?? undefined,
                    }}
                  />
                </div>
              </div>
            )}

          {/* Discussion Thread (full access only) */}
          {accessLevel === "full" && fullBooking && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Discussion
              </h3>

              <div className="mb-4 max-h-72 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
                {fullBooking.comments.length === 0 ? (
                  <p className="py-6 text-center text-xs text-gray-400">
                    No messages yet. Start a conversation with the admin.
                  </p>
                ) : (
                  fullBooking.comments.map((c) => (
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
          )}
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
