"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Calendar, { useCalendarData } from "@/components/Calendar";
import { EVENT_TYPES } from "@/types";
import { format } from "date-fns";

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
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockLoading, setBlockLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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

  const showFeedback = (type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, adminNote: noteInput[id] || "" }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback("success", `Booking ${action}d successfully`);
        fetchBookings();
        fetchBlocked();
        refetchCalendar();
      } else {
        showFeedback("error", json.error || `Failed to ${action}`);
      }
    } catch {
      showFeedback("error", `Failed to ${action} booking`);
    } finally {
      setActionLoading(null);
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
        showFeedback("success", "Date blocked successfully");
        setBlockDate("");
        setBlockReason("");
        fetchBlocked();
        refetchCalendar();
      } else {
        showFeedback("error", json.error || "Failed to block date");
      }
    } catch {
      showFeedback("error", "Failed to block date");
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
        showFeedback("success", "Date unblocked");
        fetchBlocked();
        refetchCalendar();
      } else {
        showFeedback("error", json.error || "Failed to unblock");
      }
    } catch {
      showFeedback("error", "Failed to unblock date");
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
        <button
          onClick={handleLogout}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Sign Out
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.msg}
        </div>
      )}

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

                  {b.status === "PENDING" && (
                    <div className="border-t border-gray-100 pt-4">
                      <input
                        type="text"
                        placeholder="Admin note (optional)"
                        value={noteInput[b.id] || ""}
                        onChange={(e) =>
                          setNoteInput({ ...noteInput, [b.id]: e.target.value })
                        }
                        className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(b.id, "approve")}
                          disabled={actionLoading === b.id}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === b.id ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleAction(b.id, "reject")}
                          disabled={actionLoading === b.id}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionLoading === b.id ? "..." : "Reject"}
                        </button>
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
                {blockedDates.map((bd) => (
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
                    <button
                      onClick={() => handleUnblockDate(bd.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
