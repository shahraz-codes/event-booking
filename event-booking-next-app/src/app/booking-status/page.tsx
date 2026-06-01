"use client";

import {
  Fragment,
  useState,
  FormEvent,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  EVENT_TYPES,
  BOOKING_STATUS_LABELS,
  type BookingComment,
  type QuotationData,
  type BookingStatus,
  type CustomerBookingAction,
} from "@/types";
import { format } from "date-fns";
import DownloadReceipt from "@/components/BookingReceipt";
import DownloadQuotation from "@/components/QuotationPDF";
import Calendar, { useCalendarData } from "@/components/Calendar";

interface BookingBasic {
  bookingId: string;
  name: string;
  date: string;
  eventType: string;
  numberOfAttendees: number;
  status: BookingStatus;
  adminNote: string | null;
  previousDate: string | null;
  requestedNewDate: string | null;
  conflictedAt: string | null;
  createdAt: string;
}

interface BookingFull extends BookingBasic {
  phone: string;
  email: string | null;
  notes: string | null;
  totalAmount: number | null;
  advanceAmount: number | null;
  notifyViaWhatsapp: boolean;
  notifyViaEmail: boolean;
  cancellationReason: string | null;
  cancelledBy: string | null;
  dateChangeReason: string | null;
  dateChangeAcknowledged: boolean;
  conflictingBookingId: string | null;
  conflictWinner: {
    bookingId: string;
    name: string;
    date: string;
  } | null;
  comments: BookingComment[];
  quotation?: QuotationData | null;
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { bg: string; border: string; badge: string }
> = {
  PENDING: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
  },
  QUOTATION_SENT: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
  },
  QUOTATION_FINALIZED: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-800",
  },
  APPROVED: {
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100 text-green-800",
  },
  REJECTED: {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800",
  },
  CANCELLATION_REQUESTED: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-800",
  },
  DATE_CHANGE_REQUESTED: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-800",
  },
  CONFLICTED: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-800",
  },
  CANCELLED: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    badge: "bg-gray-200 text-gray-700",
  },
};

const PROGRESS_STEPS: { status: BookingStatus; label: string }[] = [
  { status: "PENDING", label: "Submitted" },
  { status: "QUOTATION_SENT", label: "Quotation" },
  { status: "QUOTATION_FINALIZED", label: "Finalized" },
  { status: "APPROVED", label: "Approved" },
];

const TERMINAL_OR_OFFTRACK: BookingStatus[] = [
  "REJECTED",
  "CANCELLED",
  "CONFLICTED",
];

function getProgressIndex(status: BookingStatus): number {
  if (TERMINAL_OR_OFFTRACK.includes(status)) return -1;
  if (status === "CANCELLATION_REQUESTED" || status === "DATE_CHANGE_REQUESTED")
    return PROGRESS_STEPS.findIndex((s) => s.status === "APPROVED");
  return PROGRESS_STEPS.findIndex((s) => s.status === status);
}

const DIRECT_CANCELLABLE = [
  "PENDING",
  "QUOTATION_SENT",
  "QUOTATION_FINALIZED",
  "CONFLICTED",
] as const;
const DIRECT_DATE_CHANGEABLE = [
  "PENDING",
  "QUOTATION_SENT",
  "QUOTATION_FINALIZED",
] as const;

function BookingStatusContent() {
  const searchParams = useSearchParams();
  const prefilledToken = searchParams.get("token") || "";
  const prefilledId = searchParams.get("id") || "";

  const [bookingId, setBookingId] = useState(prefilledId);
  const [booking, setBooking] = useState<BookingBasic | BookingFull | null>(null);
  const [accessLevel, setAccessLevel] = useState<"basic" | "full">("basic");
  const [authToken, setAuthToken] = useState<string>(prefilledToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [secretCode, setSecretCode] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [commentInput, setCommentInput] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // cancellation modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // date-change modal
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [dateModalMode, setDateModalMode] = useState<"direct" | "request" | "pick">("direct");
  const [newDate, setNewDate] = useState<string | null>(null);
  const [dateReason, setDateReason] = useState("");

  const { disabledDates } = useCalendarData();

  const buildQuery = useCallback(
    (overrides?: { secretCode?: string; bookingIdOverride?: string }) => {
      const sp = new URLSearchParams();
      if (authToken) {
        sp.set("token", authToken);
      } else {
        const idForQuery =
          overrides?.bookingIdOverride || bookingId || (booking?.bookingId ?? "");
        if (idForQuery) sp.set("bookingId", idForQuery);
        const code = overrides?.secretCode ?? secretCode;
        if (code) sp.set("secretCode", code);
      }
      return sp.toString();
    },
    [authToken, bookingId, secretCode, booking]
  );

  const fetchStatus = useCallback(
    async (opts?: {
      idOverride?: string;
      tokenOverride?: string;
      secretOverride?: string;
    }) => {
      setLoading(true);
      setError(null);

      try {
        const sp = new URLSearchParams();
        if (opts?.tokenOverride ?? authToken) {
          sp.set("token", opts?.tokenOverride ?? authToken);
        } else {
          sp.set("bookingId", (opts?.idOverride ?? bookingId).trim());
          if (opts?.secretOverride ?? secretCode) {
            sp.set("secretCode", opts?.secretOverride ?? secretCode);
          }
        }

        const res = await fetch(`/api/bookings/status?${sp.toString()}`);
        const json = await res.json();

        if (!json.success) {
          setError(json.error || "Booking not found");
          setBooking(null);
          return;
        }

        setBooking(json.data);
        setAccessLevel(json.accessLevel || "basic");
        if (json.data?.bookingId) setBookingId(json.data.bookingId);
      } catch {
        setError("Failed to fetch status. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [authToken, bookingId, secretCode]
  );

  // bootstrap from URL
  useEffect(() => {
    if (prefilledToken) {
      fetchStatus({ tokenOverride: prefilledToken });
    } else if (prefilledId) {
      fetchStatus({ idOverride: prefilledId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledToken, prefilledId]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!bookingId.trim()) return;
    setAuthToken("");
    setSecretCode("");
    setUnlockError(null);
    fetchStatus({ idOverride: bookingId.trim() });
  };

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!secretCode.trim() || !booking) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const sp = new URLSearchParams({
        bookingId: booking.bookingId,
        secretCode: secretCode.trim(),
      });
      const res = await fetch(`/api/bookings/status?${sp.toString()}`);
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
      const body: Record<string, unknown> = { message: msg };
      if (authToken) body.token = authToken;
      else {
        body.bookingId = booking.bookingId;
        body.secretCode = secretCode.trim();
      }
      const res = await fetch("/api/bookings/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setCommentInput("");
        await fetchStatus();
      }
    } catch {
      /* noop */
    } finally {
      setCommentLoading(false);
    }
  };

  const callAction = async (
    action: CustomerBookingAction,
    extra?: { reason?: string; newDate?: string }
  ) => {
    if (!booking) return;
    setActionError(null);
    setActionLoading(action);
    try {
      const auth: Record<string, string> = {};
      if (authToken) auth.token = authToken;
      else auth.secretCode = secretCode.trim();

      const res = await fetch(
        `/api/bookings/${encodeURIComponent(booking.bookingId)}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, auth, ...extra }),
        }
      );
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error || "Action failed");
        return;
      }
      // refresh
      await fetchStatus();
      setCancelModalOpen(false);
      setCancelReason("");
      setDateModalOpen(false);
      setNewDate(null);
      setDateReason("");
    } catch {
      setActionError("Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const onConfirmCancel = () => {
    if (!booking) return;
    const isRequest = booking.status === "APPROVED";
    if (isRequest && !cancelReason.trim()) {
      setActionError("A reason is required when requesting cancellation of an approved booking");
      return;
    }
    void callAction(isRequest ? "request_cancel" : "cancel", {
      reason: cancelReason.trim() || undefined,
    });
  };

  const onConfirmDateChange = () => {
    if (!booking || !newDate) return;
    if (dateModalMode === "pick") {
      void callAction("pick_new_date", { newDate, reason: dateReason.trim() || undefined });
      return;
    }
    if (dateModalMode === "request" && !dateReason.trim()) {
      setActionError("A reason is required for date change request on an approved booking");
      return;
    }
    void callAction(
      dateModalMode === "request" ? "request_date_change" : "change_date",
      { newDate, reason: dateReason.trim() || undefined }
    );
  };

  const openCancelModal = () => {
    setCancelReason("");
    setActionError(null);
    setCancelModalOpen(true);
  };

  const openDateModal = (mode: "direct" | "request" | "pick") => {
    setDateModalMode(mode);
    setNewDate(null);
    setDateReason("");
    setActionError(null);
    setDateModalOpen(true);
  };

  const eventLabel = (val: string) =>
    EVENT_TYPES.find((t) => t.value === val)?.label || val;

  const fullBooking = accessLevel === "full" ? (booking as BookingFull) : null;
  const progressIdx = booking ? getProgressIndex(booking.status) : -1;

  const canDirectCancel =
    !!booking && (DIRECT_CANCELLABLE as readonly BookingStatus[]).includes(booking.status);
  const canRequestCancel = booking?.status === "APPROVED";
  const canDirectDateChange =
    !!booking &&
    (DIRECT_DATE_CHANGEABLE as readonly BookingStatus[]).includes(booking.status);
  const canRequestDateChange = booking?.status === "APPROVED";
  const canWithdrawRequest =
    booking?.status === "CANCELLATION_REQUESTED" ||
    booking?.status === "DATE_CHANGE_REQUESTED";
  const showCalendarPicker = booking?.status === "CONFLICTED";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 text-center sm:mb-10">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-600">
          Track Your Request
        </p>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Booking Status
        </h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-base">
          {authToken
            ? "Opened via your private link"
            : "Enter your Booking ID to check the status"}
        </p>
      </div>

      {!authToken && (
        <form onSubmit={handleSubmit} className="mb-8 flex gap-2 sm:gap-3">
          <input
            type="text"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="e.g. BNQ-2026-0001"
            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-3 text-sm font-mono text-gray-900 placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:px-4"
          />
          <button
            type="submit"
            disabled={loading || !bookingId.trim()}
            className="shrink-0 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 sm:px-6"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Search"
            )}
          </button>
        </form>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {booking && (
        <div className="space-y-4">
          {/* Conflict / requested-state banners */}
          {booking.status === "CONFLICTED" && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 sm:p-6">
              <h3 className="mb-1 text-lg font-bold text-rose-900">
                Your event date is no longer available
              </h3>
              <p className="mb-3 text-sm text-rose-800">
                Another customer&apos;s booking for{" "}
                <strong>
                  {format(new Date(booking.date), "EEEE, MMMM d, yyyy")}
                </strong>{" "}
                has been confirmed. Pick a new date below or cancel your
                request — we can also discuss alternatives in the chat thread.
              </p>
              {fullBooking?.conflictWinner && (
                <p className="text-xs text-rose-700">
                  Confirmed booking:{" "}
                  <span className="font-mono">
                    {fullBooking.conflictWinner.bookingId}
                  </span>
                </p>
              )}
            </div>
          )}

          {booking.status === "CANCELLATION_REQUESTED" && (
            <div className="rounded-2xl border border-orange-300 bg-orange-50 p-4 sm:p-6">
              <h3 className="mb-1 font-semibold text-orange-900">
                Cancellation requested
              </h3>
              <p className="text-sm text-orange-800">
                Your cancellation request has been submitted. We&apos;ll review
                it and respond soon.
              </p>
            </div>
          )}

          {booking.status === "DATE_CHANGE_REQUESTED" && (
            <div className="rounded-2xl border border-purple-300 bg-purple-50 p-4 sm:p-6">
              <h3 className="mb-1 font-semibold text-purple-900">
                Date change requested
              </h3>
              <p className="text-sm text-purple-800">
                You requested to move to{" "}
                <strong>
                  {booking.requestedNewDate
                    ? format(new Date(booking.requestedNewDate), "EEEE, MMMM d, yyyy")
                    : "a new date"}
                </strong>
                . Awaiting admin approval.
              </p>
            </div>
          )}

          {booking.status === "CANCELLED" && (
            <div className="rounded-2xl border border-gray-300 bg-gray-100 p-4 sm:p-6">
              <h3 className="mb-1 font-semibold text-gray-800">
                Booking cancelled
              </h3>
              {fullBooking?.cancellationReason && (
                <p className="text-sm text-gray-700">
                  Reason: {fullBooking.cancellationReason}
                </p>
              )}
            </div>
          )}

          {/* Progress Tracker */}
          {progressIdx >= 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Booking Progress
              </h3>
              <div className="mx-auto flex w-full max-w-md items-start">
                {PROGRESS_STEPS.map((step, idx) => {
                  const isLast = idx === PROGRESS_STEPS.length - 1;
                  const isReached = idx <= progressIdx;
                  const isCompleted = idx < progressIdx || (isLast && isReached);
                  return (
                    <Fragment key={step.status}>
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            isReached
                              ? "bg-brand-600 text-white"
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
                            isReached ? "text-brand-800" : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {!isLast && (
                        <div
                          className={`mx-1 mt-[15px] h-0.5 flex-1 ${
                            idx < progressIdx ? "bg-brand-600" : "bg-gray-200"
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
          <div
            className={`rounded-2xl border ${STATUS_CONFIG[booking.status].border} ${STATUS_CONFIG[booking.status].bg} p-4 sm:p-6`}
          >
            <div className="mb-4 flex items-center gap-3">
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CONFIG[booking.status].badge}`}
              >
                {BOOKING_STATUS_LABELS[booking.status]}
              </span>
            </div>

            <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
              <Row label="Booking ID" value={booking.bookingId} mono />
              <Row label="Name" value={booking.name} />
              <Row label="Event" value={eventLabel(booking.eventType)} />
              <Row label="Attendees" value={String(booking.numberOfAttendees)} />
              <Row
                label="Date"
                value={
                  booking.previousDate
                    ? `${format(new Date(booking.date), "EEEE, MMMM d, yyyy")} (changed from ${format(new Date(booking.previousDate), "MMM d")})`
                    : format(new Date(booking.date), "EEEE, MMMM d, yyyy")
                }
              />
              {booking.status === "DATE_CHANGE_REQUESTED" &&
                booking.requestedNewDate && (
                  <Row
                    label="Requested Date"
                    value={format(
                      new Date(booking.requestedNewDate),
                      "EEEE, MMMM d, yyyy"
                    )}
                  />
                )}
              <Row
                label="Submitted"
                value={format(new Date(booking.createdAt), "MMM d, yyyy h:mm a")}
              />
              {booking.adminNote && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-500">Admin Note</p>
                  <p className="mt-1 text-sm text-gray-700">{booking.adminNote}</p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Actions */}
          {accessLevel === "full" &&
            (canDirectCancel ||
              canRequestCancel ||
              canDirectDateChange ||
              canRequestDateChange ||
              canWithdrawRequest ||
              showCalendarPicker) && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Booking Actions
                </h3>
                {actionError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {actionError}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {showCalendarPicker && (
                    <button
                      onClick={() => openDateModal("pick")}
                      disabled={actionLoading !== null}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      Pick a new date
                    </button>
                  )}
                  {canDirectDateChange && (
                    <button
                      onClick={() => openDateModal("direct")}
                      disabled={actionLoading !== null}
                      className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-800 hover:bg-purple-100 disabled:opacity-50"
                    >
                      Change event date
                    </button>
                  )}
                  {canRequestDateChange && (
                    <button
                      onClick={() => openDateModal("request")}
                      disabled={actionLoading !== null}
                      className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-800 hover:bg-purple-100 disabled:opacity-50"
                    >
                      Request date change
                    </button>
                  )}
                  {(canDirectCancel || canRequestCancel) && (
                    <button
                      onClick={openCancelModal}
                      disabled={actionLoading !== null}
                      className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {canRequestCancel
                        ? "Request cancellation"
                        : "Cancel booking"}
                    </button>
                  )}
                  {canWithdrawRequest && (
                    <button
                      onClick={() => callAction("withdraw_request")}
                      disabled={actionLoading !== null}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {actionLoading === "withdraw_request"
                        ? "Withdrawing..."
                        : "Withdraw request"}
                    </button>
                  )}
                </div>
              </div>
            )}

          {/* Unlock Section (when basic access) */}
          {accessLevel === "basic" && !authToken && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-brand-900">
                  Unlock Full Access
                </h3>
              </div>
              <p className="mb-3 text-xs text-brand-800">
                Enter your secret code to access quotation details, discussion,
                bill download, and booking actions. (Newer bookings use a private
                link emailed/sent to you instead.)
              </p>
              <form onSubmit={handleUnlock} className="flex gap-2">
                <input
                  type="text"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                  placeholder="Enter secret code"
                  maxLength={6}
                  className="flex-1 rounded-lg border border-brand-300 bg-white px-3 py-2 text-center font-mono text-sm font-bold tracking-widest text-brand-900 placeholder-brand-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  type="submit"
                  disabled={unlocking || secretCode.trim().length === 0}
                  className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
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

          {/* Quotation */}
          {fullBooking?.quotation && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-900">Quotation</h3>
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
                      <tr key={item.id || idx} className="border-b border-gray-50">
                        <td className="px-2 py-2 align-top text-gray-400 sm:px-4">
                          {idx + 1}
                        </td>
                        <td className="break-words px-2 py-2 text-gray-800 sm:px-4">
                          {item.particular}
                          {item.quantity && item.unit && (
                            <span className="ml-1 text-xs text-gray-500">
                              ({item.quantity} {item.unit})
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right align-top font-medium text-gray-900 sm:px-4">
                          {item.amount
                            ? `₹${item.amount.toLocaleString("en-IN")}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td
                        colSpan={2}
                        className="px-2 py-2 font-semibold text-gray-900 sm:px-4"
                      >
                        Total
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-bold text-gray-900 sm:px-4">
                        &#8377;
                        {fullBooking.quotation.totalAmount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    {fullBooking.quotation.advanceAmount > 0 && (
                      <>
                        <tr>
                          <td colSpan={2} className="px-2 py-1 text-gray-600 sm:px-4">
                            Advance
                          </td>
                          <td className="whitespace-nowrap px-2 py-1 text-right font-medium text-gray-700 sm:px-4">
                            &#8377;
                            {fullBooking.quotation.advanceAmount.toLocaleString(
                              "en-IN"
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan={2}
                            className="px-2 py-1 font-semibold text-brand-800 sm:px-4"
                          >
                            Balance
                          </td>
                          <td className="whitespace-nowrap px-2 py-1 text-right font-bold text-brand-800 sm:px-4">
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

          {/* Payment Summary for Approved Bookings */}
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
                      &#8377;
                      {(fullBooking.advanceAmount ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-sm">
                    <span className="font-medium text-gray-700">Balance Due</span>
                    <span className="font-bold text-brand-800">
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

          {/* Discussion Thread */}
          {accessLevel === "full" && fullBooking && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
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
                            ? "bg-brand-600 text-white"
                            : "bg-white text-gray-800 shadow-sm"
                        }`}
                      >
                        <p className="mb-0.5 text-xs font-medium opacity-75">
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
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                />
                <button
                  onClick={handleSendComment}
                  disabled={commentLoading || !commentInput.trim()}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {commentLoading ? "..." : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel modal */}
      {cancelModalOpen && booking && (
        <ModalShell title="Cancel Booking" onClose={() => setCancelModalOpen(false)}>
          <p className="mb-3 text-sm text-gray-700">
            {booking.status === "APPROVED"
              ? "Your booking is already approved. Submitting a cancellation request will notify the admin, who will review and respond."
              : "This will cancel your booking and free the date for other customers. You can submit a fresh booking any time."}
          </p>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Reason{booking.status === "APPROVED" ? " (required)" : " (optional)"}
          </label>
          <textarea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="Let us know why..."
          />
          {actionError && (
            <p className="mt-2 text-xs text-red-600">{actionError}</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={onConfirmCancel}
              disabled={actionLoading !== null}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading
                ? "..."
                : booking.status === "APPROVED"
                  ? "Submit cancellation request"
                  : "Confirm cancellation"}
            </button>
          </div>
        </ModalShell>
      )}

      {/* Date-change modal */}
      {dateModalOpen && booking && (
        <ModalShell
          title={
            dateModalMode === "pick"
              ? "Pick a new date"
              : dateModalMode === "request"
                ? "Request date change"
                : "Change event date"
          }
          onClose={() => setDateModalOpen(false)}
        >
          <p className="mb-3 text-sm text-gray-700">
            {dateModalMode === "request"
              ? "Your booking is already approved. Submit a request and the admin will review."
              : "Pick a new date from the calendar below. Greyed-out dates are unavailable."}
          </p>
          <Calendar
            selectedDate={newDate}
            onDateSelect={setNewDate}
            disabledDates={disabledDates}
          />
          <label className="mb-1 mt-3 block text-xs font-medium text-gray-700">
            Reason{dateModalMode === "request" ? " (required)" : " (optional)"}
          </label>
          <textarea
            rows={2}
            value={dateReason}
            onChange={(e) => setDateReason(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="Optional context for the admin..."
          />
          {actionError && (
            <p className="mt-2 text-xs text-red-600">{actionError}</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setDateModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={onConfirmDateChange}
              disabled={!newDate || actionLoading !== null}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {actionLoading
                ? "..."
                : dateModalMode === "request"
                  ? "Submit request"
                  : "Confirm new date"}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      }
    >
      <BookingStatusContent />
    </Suspense>
  );
}
