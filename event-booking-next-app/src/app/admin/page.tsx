"use client";

import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Calendar, { useCalendarData } from "@/components/Calendar";
import { EVENT_TYPES, BOOKING_STATUS_LABELS } from "@/types";
import type { BookingComment, QuotationData, QuotationItemData } from "@/types";
import { format } from "date-fns";
import { ToastProvider, useToast } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";

type BookingStatus =
  | "PENDING"
  | "QUOTATION_SENT"
  | "QUOTATION_FINALIZED"
  | "APPROVED"
  | "REJECTED";

interface Booking {
  id: string;
  bookingId: string;
  name: string;
  phone: string;
  date: string;
  eventType: string;
  numberOfAttendees: number;
  notes: string | null;
  status: BookingStatus;
  adminNote: string | null;
  totalAmount: number | null;
  advanceAmount: number | null;
  comments: BookingComment[];
  quotation?: QuotationData | null;
  createdAt: string;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "QUOTATION_SENT", label: "Quotation Sent" },
  { key: "QUOTATION_FINALIZED", label: "Finalized" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
] as const;

const EMPTY_ITEM: QuotationItemData = {
  particular: "",
  quantity: null,
  unit: null,
  rate: null,
  amount: 0,
  order: 0,
};

export default function AdminPage() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminPageContent />
      </ConfirmProvider>
    </ToastProvider>
  );
}

interface ApprovalForm {
  totalAmount: string;
  advanceAmount: string;
  adminNote: string;
}

function AdminPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockLoading, setBlockLoading] = useState(false);

  const [expandedDiscussion, setExpandedDiscussion] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);
  const discussionEndRef = useRef<Record<string, HTMLDivElement | null>>({});

  const [approvalTarget, setApprovalTarget] = useState<string | null>(null);
  const [approvalForm, setApprovalForm] = useState<ApprovalForm>({
    totalAmount: "",
    advanceAmount: "",
    adminNote: "",
  });

  const [expandedQuotation, setExpandedQuotation] = useState<Set<string>>(new Set());

  // Quotation builder state
  const [quotationTarget, setQuotationTarget] = useState<string | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItemData[]>([
    { ...EMPTY_ITEM },
  ]);
  const [quotationAdvance, setQuotationAdvance] = useState("");
  const [quotationNotes, setQuotationNotes] = useState("");
  const [quotationLoading, setQuotationLoading] = useState(false);

  const { disabledDates, refetch: refetchCalendar } = useCalendarData();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("status", activeTab);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/admin/bookings?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setBookings(json.data);
        const total = json.total ?? json.data.length;
        const pages = json.totalPages ?? 1;
        setTotalBookings(total);
        setTotalPages(pages);
        if (page > pages) setPage(pages);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize]);

  const fetchBlocked = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/blocked-dates");
      const json = await res.json();
      if (json.success) setBlockedDates(json.data);
    } catch (err) {
      console.error("Failed to fetch blocked dates:", err);
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, pageSize]);

  useEffect(() => {
    setLoading(true);
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  // ─── Booking Actions ────────────────────────────────────

  const handleAction = async (
    id: string,
    action: "approve" | "reject" | "cancel",
    extra?: { totalAmount: number; advanceAmount: number; adminNote?: string }
  ) => {
    setActionLoading(id);
    try {
      const payload: Record<string, unknown> = {
        id,
        action,
        adminNote: extra?.adminNote ?? noteInput[id] ?? "",
      };
      if (action === "approve" && extra) {
        payload.totalAmount = extra.totalAmount;
        payload.advanceAmount = extra.advanceAmount;
      }
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast(
          "success",
          `Booking ${action === "cancel" ? "cancelled" : `${action}d`} successfully`
        );
        setApprovalTarget(null);
        setApprovalForm({ totalAmount: "", advanceAmount: "", adminNote: "" });
        fetchBookings();
        fetchBlocked();
        refetchCalendar();
      } else {
        toast("error", json.error || `Failed to ${action}`);
      }
    } catch {
      toast("error", `Failed to ${action} booking`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveSubmit = (id: string) => {
    const total = parseFloat(approvalForm.totalAmount);
    const advance = parseFloat(approvalForm.advanceAmount);
    if (isNaN(total) || total <= 0) {
      toast("error", "Please enter a valid total amount");
      return;
    }
    if (isNaN(advance) || advance < 0) {
      toast("error", "Please enter a valid advance amount");
      return;
    }
    if (advance > total) {
      toast("error", "Advance amount cannot exceed total amount");
      return;
    }
    handleAction(id, "approve", {
      totalAmount: total,
      advanceAmount: advance,
      adminNote: approvalForm.adminNote,
    });
  };

  // ─── Quotation Actions ──────────────────────────────────

  const openQuotationBuilder = (booking: Booking) => {
    if (booking.quotation) {
      setQuotationItems(
        booking.quotation.items.map((it) => ({
          id: it.id,
          particular: it.particular,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
          amount: it.amount,
          order: it.order,
        }))
      );
      setQuotationAdvance(String(booking.quotation.advanceAmount || ""));
      setQuotationNotes(booking.quotation.notes || "");
    } else {
      setQuotationItems([{ ...EMPTY_ITEM }]);
      setQuotationAdvance("");
      setQuotationNotes("");
    }
    setQuotationTarget(booking.id);
  };

  const closeQuotationBuilder = () => {
    setQuotationTarget(null);
    setQuotationItems([{ ...EMPTY_ITEM }]);
    setQuotationAdvance("");
    setQuotationNotes("");
  };

  const addQuotationRow = () => {
    setQuotationItems((prev) => [
      ...prev,
      { ...EMPTY_ITEM, order: prev.length },
    ]);
  };

  const removeQuotationRow = (idx: number) => {
    setQuotationItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuotationRow = (
    idx: number,
    field: keyof QuotationItemData,
    value: string | number | null
  ) => {
    setQuotationItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const quotationTotal = quotationItems.reduce(
    (sum, it) => sum + (it.amount || 0),
    0
  );

  const handleSaveQuotation = async (bookingId: string, booking: Booking) => {
    const validItems = quotationItems.filter(
      (it) => it.particular.trim()
    );
    if (validItems.length === 0) {
      toast("error", "Add at least one item with a particular");
      return;
    }

    setQuotationLoading(true);
    try {
      const isUpdate = !!booking.quotation;
      const url = "/api/admin/quotations";

      const body = isUpdate
        ? {
            quotationId: booking.quotation!.id,
            items: validItems.map((it, idx) => ({
              ...it,
              order: idx,
            })),
            advanceAmount: parseFloat(quotationAdvance) || 0,
            notes: quotationNotes || null,
          }
        : {
            bookingId,
            items: validItems.map((it, idx) => ({
              ...it,
              order: idx,
            })),
            advanceAmount: parseFloat(quotationAdvance) || 0,
            notes: quotationNotes || null,
          };

      const res = await fetch(url, {
        method: isUpdate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        toast("success", `Quotation ${isUpdate ? "updated" : "created"}`);
        closeQuotationBuilder();
        fetchBookings();
      } else {
        toast("error", json.error || "Failed to save quotation");
      }
    } catch {
      toast("error", "Failed to save quotation");
    } finally {
      setQuotationLoading(false);
    }
  };

  const handleQuotationAction = async (
    quotationId: string,
    action: "send" | "finalize"
  ) => {
    setQuotationLoading(true);
    try {
      const res = await fetch("/api/admin/quotations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotationId, action }),
      });
      const json = await res.json();
      if (json.success) {
        toast(
          "success",
          action === "send" ? "Quotation sent to customer" : "Quotation finalized"
        );
        fetchBookings();
      } else {
        toast("error", json.error || `Failed to ${action} quotation`);
      }
    } catch {
      toast("error", `Failed to ${action} quotation`);
    } finally {
      setQuotationLoading(false);
    }
  };

  // ─── Comments ───────────────────────────────────────────

  const handleSendComment = async (bookingId: string) => {
    const msg = commentInput[bookingId]?.trim();
    if (!msg) return;

    setCommentLoading(bookingId);
    try {
      const res = await fetch("/api/admin/bookings/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, message: msg }),
      });
      const json = await res.json();
      if (json.success) {
        setCommentInput((prev) => ({ ...prev, [bookingId]: "" }));
        fetchBookings();
      } else {
        toast("error", json.error || "Failed to send comment");
      }
    } catch {
      toast("error", "Failed to send comment");
    } finally {
      setCommentLoading(null);
    }
  };

  // ─── Block Date ─────────────────────────────────────────

  const handleBlockDate = async (e: FormEvent) => {
    e.preventDefault();
    if (!blockDate) return;
    setBlockLoading(true);
    try {
      const res = await fetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: blockDate, reason: blockReason || null }),
      });
      const json = await res.json();
      if (json.success) {
        toast("success", "Date blocked successfully");
        setBlockDate("");
        setBlockReason("");
        fetchBlocked();
        refetchCalendar();
      } else {
        toast("error", json.error || "Failed to block date");
      }
    } catch {
      toast("error", "Failed to block date");
    } finally {
      setBlockLoading(false);
    }
  };

  const handleUnblockDate = async (id: string) => {
    try {
      const res = await fetch("/api/admin/blocked-dates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        toast("success", "Date unblocked");
        fetchBlocked();
        refetchCalendar();
      } else {
        toast("error", json.error || "Failed to unblock");
      }
    } catch {
      toast("error", "Failed to unblock date");
    }
  };

  // ─── Helpers ────────────────────────────────────────────

  const eventLabel = (val: string) =>
    EVENT_TYPES.find((t) => t.value === val)?.label || val;

  const statusBadge = (status: BookingStatus) => {
    const map: Record<BookingStatus, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      QUOTATION_SENT: "bg-blue-100 text-blue-800",
      QUOTATION_FINALIZED: "bg-indigo-100 text-indigo-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}
      >
        {BOOKING_STATUS_LABELS[status]}
      </span>
    );
  };

  const canCreateOrEditQuotation = (b: Booking) =>
    b.status !== "APPROVED" && b.status !== "REJECTED";

  const canApprove = (b: Booking) =>
    b.status === "PENDING" ||
    b.status === "QUOTATION_SENT" ||
    b.status === "QUOTATION_FINALIZED";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            Manage bookings, quotations, and block dates
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Link
            href="/admin/homepage"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:px-4"
          >
            Homepage
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:px-4"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid gap-6 sm:gap-8 xl:grid-cols-3">
        {/* Bookings List */}
        <div className="xl:col-span-2">
          {/* Mobile: Filter button */}
          <div className="mb-4 sm:hidden">
            <button
              type="button"
              onClick={() => setFilterModalOpen(true)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                <span>Filter</span>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-900">
                  {TABS.find((t) => t.key === activeTab)?.label ?? "All"}
                </span>
              </span>
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Desktop: Horizontal tabs */}
          <div className="mb-4 hidden sm:block">
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-white text-brand-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile filter modal */}
          {filterModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Filter bookings"
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:hidden"
              onClick={() => setFilterModalOpen(false)}
            >
              <div
                className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">
                    Filter by status
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFilterModalOpen(false)}
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.key);
                        setFilterModalOpen(false);
                      }}
                      className={`flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                        activeTab === tab.key
                          ? "bg-brand-50 text-brand-900"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {activeTab === tab.key && (
                        <svg
                          className="h-5 w-5 text-brand-700"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pagination (above the list) */}
          {!loading && totalBookings > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <p className="text-xs text-gray-600 sm:text-sm">
                  Showing{" "}
                  <span className="font-semibold text-gray-900">
                    {(page - 1) * pageSize + 1}
                  </span>
                  –
                  <span className="font-semibold text-gray-900">
                    {Math.min(page * pageSize, totalBookings)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-900">
                    {totalBookings}
                  </span>
                </p>
                <label className="flex items-center gap-2 text-xs text-gray-600 sm:text-sm">
                  <span className="hidden sm:inline">Per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm"
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                  aria-label="Previous page"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <span className="text-xs font-medium text-gray-700 sm:text-sm">
                  Page{" "}
                  <span className="font-semibold text-brand-900">{page}</span>{" "}
                  of <span className="font-semibold text-gray-900">{totalPages}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Booking Cards */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
              No bookings found
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm font-semibold text-brand-800">
                        {b.bookingId}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {b.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.quotation && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            b.quotation.status === "FINALIZED"
                              ? "bg-green-100 text-green-700"
                              : b.quotation.status === "SENT"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          Q: {b.quotation.status}
                        </span>
                      )}
                      {statusBadge(b.status)}
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{b.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Event</p>
                      <p className="font-medium text-gray-900">
                        {eventLabel(b.eventType)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium text-gray-900">
                        {format(new Date(b.date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Attendees</p>
                      <p className="font-medium text-gray-900">
                        {b.numberOfAttendees || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Submitted</p>
                      <p className="font-medium text-gray-900">
                        {format(new Date(b.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  {b.notes && (
                    <p className="mb-4 text-sm text-gray-600">
                      <span className="font-medium">Notes:</span> {b.notes}
                    </p>
                  )}

                  {b.adminNote && (
                    <p className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                      <span className="font-medium">Admin:</span> {b.adminNote}
                    </p>
                  )}

                  {/* Existing Quotation Summary */}
                  {b.quotation && quotationTarget !== b.id && (
                    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-blue-900">
                          Quotation ({b.quotation.items.length} items)
                        </h4>
                        <span className="font-semibold text-blue-900 text-sm">
                          &#8377;
                          {b.quotation.totalAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {(expandedQuotation.has(b.id)
                          ? b.quotation.items
                          : b.quotation.items.slice(0, 3)
                        ).map((it, i) => (
                          <div
                            key={it.id || i}
                            className="flex justify-between text-xs text-blue-800"
                          >
                            <span>
                              {it.particular}
                              {it.quantity != null && (
                                <span className="ml-1 text-blue-600">
                                  &times;{it.quantity}
                                  {it.unit ? ` ${it.unit}` : ""}
                                </span>
                              )}
                            </span>
                            {it.amount ? (
                              <span>
                                &#8377;{it.amount.toLocaleString("en-IN")}
                              </span>
                            ) : null}
                          </div>
                        ))}
                        {b.quotation.items.length > 3 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedQuotation((prev) => {
                                const next = new Set(prev);
                                if (next.has(b.id)) next.delete(b.id);
                                else next.add(b.id);
                                return next;
                              })
                            }
                            className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {expandedQuotation.has(b.id)
                              ? "Show less"
                              : `+${b.quotation.items.length - 3} more items`}
                          </button>
                        )}
                      </div>
                      {canCreateOrEditQuotation(b) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {b.quotation.status !== "FINALIZED" && (
                            <button
                              onClick={() => openQuotationBuilder(b)}
                              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              Edit
                            </button>
                          )}
                          {b.quotation.status === "DRAFT" && (
                            <button
                              onClick={() =>
                                handleQuotationAction(b.quotation!.id, "send")
                              }
                              disabled={quotationLoading}
                              className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              Send to Customer
                            </button>
                          )}
                          {b.quotation.status === "SENT" && (
                            <button
                              onClick={() =>
                                handleQuotationAction(
                                  b.quotation!.id,
                                  "finalize"
                                )
                              }
                              disabled={quotationLoading}
                              className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Finalize
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quotation Builder */}
                  {quotationTarget === b.id && (
                    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
                      <h4 className="mb-3 text-sm font-semibold text-blue-900">
                        {b.quotation ? "Edit Quotation" : "Create Quotation"}
                      </h4>
                      <div className="space-y-3 sm:space-y-2">
                        {quotationItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-blue-100 bg-white/60 p-2 sm:flex sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
                          >
                            <input
                              type="text"
                              placeholder="Particular (e.g. 2 A/C Halls)"
                              value={item.particular}
                              onChange={(e) =>
                                updateQuotationRow(
                                  idx,
                                  "particular",
                                  e.target.value
                                )
                              }
                              className="col-span-2 rounded-md border border-blue-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400 sm:col-span-1 sm:flex-1"
                            />
                            <div className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-1 sm:flex sm:items-center">
                              <input
                                type="number"
                                placeholder="Qty"
                                value={item.quantity ?? ""}
                                onChange={(e) =>
                                  updateQuotationRow(
                                    idx,
                                    "quantity",
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : null
                                  )
                                }
                                className="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400 sm:w-16"
                              />
                              <input
                                type="text"
                                placeholder="Unit"
                                value={item.unit ?? ""}
                                onChange={(e) =>
                                  updateQuotationRow(
                                    idx,
                                    "unit",
                                    e.target.value || null
                                  )
                                }
                                className="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400 sm:w-20"
                              />
                              <input
                                type="number"
                                placeholder="Amount"
                                value={item.amount || ""}
                                onChange={(e) =>
                                  updateQuotationRow(
                                    idx,
                                    "amount",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400 sm:w-28"
                              />
                            </div>
                            <button
                              onClick={() => removeQuotationRow(idx)}
                              disabled={quotationItems.length === 1}
                              className="col-start-2 row-start-1 justify-self-end rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30 sm:col-start-auto sm:row-start-auto"
                              aria-label="Remove item"
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={addQuotationRow}
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
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
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Add Item
                      </button>

                      <div className="mt-3 flex items-center justify-between border-t border-blue-200 pt-3">
                        <span className="text-sm font-semibold text-blue-900">
                          Total: &#8377;{quotationTotal.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input
                          type="number"
                          placeholder="Advance Amount"
                          value={quotationAdvance}
                          onChange={(e) => setQuotationAdvance(e.target.value)}
                          className="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                        />
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={quotationNotes}
                          onChange={(e) => setQuotationNotes(e.target.value)}
                          className="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleSaveQuotation(b.id, b)}
                          disabled={quotationLoading}
                          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {quotationLoading
                            ? "..."
                            : b.quotation
                              ? "Update Quotation"
                              : "Create Quotation"}
                        </button>
                        <button
                          onClick={closeQuotationBuilder}
                          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Financial Summary for Approved */}
                  {b.status === "APPROVED" && b.totalAmount != null && (
                    <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg bg-green-50 px-3 py-2 text-sm">
                      <div>
                        <p className="text-green-600">Total Amount</p>
                        <p className="font-semibold text-green-900">
                          &#8377;{b.totalAmount.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-600">Advance Received</p>
                        <p className="font-semibold text-green-900">
                          &#8377;
                          {(b.advanceAmount ?? 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-600">Balance Due</p>
                        <p className="font-semibold text-green-900">
                          &#8377;
                          {(
                            b.totalAmount - (b.advanceAmount ?? 0)
                          ).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Discussion Thread */}
                  <div className="border-t border-gray-100 pt-3">
                    <button
                      onClick={() =>
                        setExpandedDiscussion(
                          expandedDiscussion === b.id ? null : b.id
                        )
                      }
                      className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-brand-800 transition-colors"
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      Discussion
                      {b.comments.length > 0 && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
                          {b.comments.length}
                        </span>
                      )}
                      <svg
                        className={`h-4 w-4 transition-transform ${expandedDiscussion === b.id ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {expandedDiscussion === b.id && (
                      <div className="mt-2">
                        <div className="mb-3 max-h-64 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
                          {b.comments.length === 0 ? (
                            <p className="py-4 text-center text-xs text-gray-400">
                              No messages yet
                            </p>
                          ) : (
                            b.comments.map((c) => (
                              <div
                                key={c.id}
                                className={`flex ${c.sender === "ADMIN" ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                    c.sender === "ADMIN"
                                      ? "bg-brand-600 text-white"
                                      : "bg-white text-gray-800 shadow-sm"
                                  }`}
                                >
                                  <p className="text-xs font-medium opacity-75 mb-0.5">
                                    {c.sender === "ADMIN" ? "You" : "Customer"}
                                  </p>
                                  <p>{c.message}</p>
                                  <p className="mt-1 text-[10px] opacity-60">
                                    {format(
                                      new Date(c.createdAt),
                                      "MMM d, h:mm a"
                                    )}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                          <div
                            ref={(el) => {
                              discussionEndRef.current[b.id] = el;
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type a message..."
                            value={commentInput[b.id] || ""}
                            onChange={(e) =>
                              setCommentInput((prev) => ({
                                ...prev,
                                [b.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendComment(b.id);
                              }
                            }}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                          />
                          <button
                            onClick={() => handleSendComment(b.id)}
                            disabled={
                              commentLoading === b.id ||
                              !commentInput[b.id]?.trim()
                            }
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                          >
                            {commentLoading === b.id ? "..." : "Send"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {canApprove(b) && (
                    <div className="border-t border-gray-100 pt-4">
                      {approvalTarget === b.id ? (
                        <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
                          <h4 className="text-sm font-semibold text-green-900">
                            Approve Booking
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-green-800">
                                Total Amount (&#8377;)
                              </label>
                              <input
                                type="number"
                                min="1"
                                step="0.01"
                                value={approvalForm.totalAmount}
                                onChange={(e) =>
                                  setApprovalForm((f) => ({
                                    ...f,
                                    totalAmount: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-green-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
                                placeholder="e.g. 50000"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-green-800">
                                Advance Received (&#8377;)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={approvalForm.advanceAmount}
                                onChange={(e) =>
                                  setApprovalForm((f) => ({
                                    ...f,
                                    advanceAmount: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-green-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
                                placeholder="e.g. 10000"
                              />
                            </div>
                          </div>
                          <input
                            type="text"
                            placeholder="Admin note (optional)"
                            value={approvalForm.adminNote}
                            onChange={(e) =>
                              setApprovalForm((f) => ({
                                ...f,
                                adminNote: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-green-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveSubmit(b.id)}
                              disabled={actionLoading === b.id}
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                            >
                              {actionLoading === b.id
                                ? "..."
                                : "Confirm Approval"}
                            </button>
                            <button
                              onClick={() => {
                                setApprovalTarget(null);
                                setApprovalForm({
                                  totalAmount: "",
                                  advanceAmount: "",
                                  adminNote: "",
                                });
                              }}
                              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {!b.quotation &&
                            b.status === "PENDING" &&
                            quotationTarget !== b.id && (
                              <button
                                onClick={() => openQuotationBuilder(b)}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                              >
                                Create Quotation
                              </button>
                            )}
                          <button
                            onClick={() => {
                              if (b.quotation) {
                                setApprovalForm({
                                  totalAmount: String(
                                    b.quotation.totalAmount
                                  ),
                                  advanceAmount: String(
                                    b.quotation.advanceAmount
                                  ),
                                  adminNote: "",
                                });
                              }
                              setApprovalTarget(b.id);
                            }}
                            disabled={actionLoading === b.id}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(b.id, "reject")}
                            disabled={actionLoading === b.id}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                          >
                            {actionLoading === b.id ? "..." : "Reject"}
                          </button>
                          {noteInput[b.id] === undefined && (
                            <input
                              type="text"
                              placeholder="Admin note for rejection (optional)"
                              value={noteInput[b.id] || ""}
                              onChange={(e) =>
                                setNoteInput({
                                  ...noteInput,
                                  [b.id]: e.target.value,
                                })
                              }
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {b.status === "APPROVED" && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <button
                          onClick={() => handleAction(b.id, "cancel")}
                          disabled={actionLoading === b.id}
                          className="self-start rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                        >
                          {actionLoading === b.id ? "..." : "Cancel Booking"}
                        </button>
                        <span className="text-xs text-gray-500">
                          This will unblock the date and reject the booking
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Calendar */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Calendar Overview
            </h2>
            <Calendar
              selectedDate={null}
              onDateSelect={() => {}}
              disabledDates={disabledDates}
              readOnly
            />
          </div>

          {/* Block Date */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Block a Date
            </h2>
            <form onSubmit={handleBlockDate} className="space-y-3">
              <input
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              />
              <input
                type="text"
                placeholder="Reason (optional)"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              />
              <button
                type="submit"
                disabled={!blockDate || blockLoading}
                className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {blockLoading ? "Blocking..." : "Block Date"}
              </button>
            </form>
          </div>

          {/* Blocked Dates List */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Blocked Dates
            </h2>
            {blockedDates.length === 0 ? (
              <p className="text-sm text-gray-500">No blocked dates</p>
            ) : (
              <ul className="space-y-2">
                {blockedDates.map((bd) => {
                  const isBookingLinked = bd.reason?.startsWith("Booked:");
                  return (
                    <li
                      key={bd.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(new Date(bd.date), "MMM d, yyyy")}
                        </p>
                        {bd.reason && (
                          <p className="text-xs text-gray-500">{bd.reason}</p>
                        )}
                      </div>
                      {isBookingLinked ? (
                        <span
                          className="text-xs text-gray-400"
                          title="Cancel the booking to unblock this date"
                        >
                          Auto-blocked
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUnblockDate(bd.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
