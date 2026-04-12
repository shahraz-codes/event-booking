"use client";

import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Calendar, { useCalendarData } from "@/components/Calendar";
import { EVENT_TYPES } from "@/types";
import type { BookingComment } from "@/types";
import { format } from "date-fns";
import { ToastProvider, useToast } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";

type BookingStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Booking {
  id: string;
  bookingId: string;
  name: string;
  phone: string;
  date: string;
  eventType: string;
  notes: string | null;
  status: BookingStatus;
  adminNote: string | null;
  totalAmount: number | null;
  advanceAmount: number | null;
  comments: BookingComment[];
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
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
] as const;

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
  const [loading, setLoading] = useState(true);
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

  const { disabledDates, refetch: refetchCalendar } = useCalendarData();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const fetchBookings = useCallback(async () => {
    try {
      const url =
        activeTab === "all"
          ? "/api/admin/bookings"
          : `/api/admin/bookings?status=${activeTab}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setBookings(json.data);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

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
    setLoading(true);
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

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
        toast("success", `Booking ${action === "cancel" ? "cancelled" : `${action}d`} successfully`);
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

  const eventLabel = (val: string) =>
    EVENT_TYPES.find((t) => t.value === val)?.label || val;

  const statusBadge = (status: BookingStatus) => {
    const map = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Manage bookings, approve requests, and block dates
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/homepage"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Homepage
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-3">
        {/* Bookings List */}
        <div className="xl:col-span-2">
          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-white text-amber-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Booking Cards */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
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
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm font-semibold text-amber-800">
                        {b.bookingId}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {b.name}
                      </h3>
                    </div>
                    {statusBadge(b.status)}
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
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
                      <span className="font-medium">Admin:</span>{" "}
                      {b.adminNote}
                    </p>
                  )}

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
                          &#8377;{(b.advanceAmount ?? 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-600">Balance Due</p>
                        <p className="font-semibold text-green-900">
                          &#8377;{(b.totalAmount - (b.advanceAmount ?? 0)).toLocaleString("en-IN")}
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
                      className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-amber-800 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Discussion
                      {b.comments.length > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          {b.comments.length}
                        </span>
                      )}
                      <svg
                        className={`h-4 w-4 transition-transform ${expandedDiscussion === b.id ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                                      ? "bg-amber-600 text-white"
                                      : "bg-white text-gray-800 shadow-sm"
                                  }`}
                                >
                                  <p className="text-xs font-medium opacity-75 mb-0.5">
                                    {c.sender === "ADMIN" ? "You" : "Customer"}
                                  </p>
                                  <p>{c.message}</p>
                                  <p className="mt-1 text-[10px] opacity-60">
                                    {format(new Date(c.createdAt), "MMM d, h:mm a")}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                          <div ref={(el) => { discussionEndRef.current[b.id] = el; }} />
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
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                          />
                          <button
                            onClick={() => handleSendComment(b.id)}
                            disabled={commentLoading === b.id || !commentInput[b.id]?.trim()}
                            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                          >
                            {commentLoading === b.id ? "..." : "Send"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pending Actions */}
                  {b.status === "PENDING" && (
                    <div className="border-t border-gray-100 pt-4">
                      {approvalTarget === b.id ? (
                        <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
                          <h4 className="text-sm font-semibold text-green-900">
                            Approve Booking
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
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
                              {actionLoading === b.id ? "..." : "Confirm Approval"}
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
                        <>
                          <input
                            type="text"
                            placeholder="Admin note for rejection (optional)"
                            value={noteInput[b.id] || ""}
                            onChange={(e) =>
                              setNoteInput({ ...noteInput, [b.id]: e.target.value })
                            }
                            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setApprovalTarget(b.id)}
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
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {b.status === "APPROVED" && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleAction(b.id, "cancel")}
                          disabled={actionLoading === b.id}
                          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
              />
              <input
                type="text"
                placeholder="Reason (optional)"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
              />
              <button
                type="submit"
                disabled={!blockDate || blockLoading}
                className="w-full rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
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
                        <span className="text-xs text-gray-400" title="Cancel the booking to unblock this date">
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
