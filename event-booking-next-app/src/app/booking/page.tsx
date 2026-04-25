"use client";

import { useEffect, useState, FormEvent } from "react";
import Calendar, { useCalendarData } from "@/components/Calendar";
import { EVENT_TYPES, bookingSchema, getZodErrorMessage } from "@/types";
import Link from "next/link";

interface BookingResult {
  bookingId: string;
  name: string;
  date: string;
  eventType: string;
  status: string;
  secretCode: string;
}

export default function BookingPage() {
  const { disabledDates, loading: calendarLoading } = useCalendarData();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    eventType: "",
    numberOfAttendees: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (result && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [result]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedDate) {
      setError("Please select a date from the calendar");
      return;
    }

    const payload = {
      ...formData,
      date: selectedDate,
      numberOfAttendees: parseInt(formData.numberOfAttendees, 10) || 0,
    };
    const parsed = bookingSchema.safeParse(payload);
    if (!parsed.success) {
      setError(getZodErrorMessage(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error || "Failed to create booking");
        return;
      }

      setResult(json.data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copySecretCode = async () => {
    if (!result?.secretCode) return;
    try {
      await navigator.clipboard.writeText(result.secretCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center sm:px-6 sm:py-20">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 sm:p-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-green-900">
            Booking Submitted!
          </h2>
          <p className="mb-6 text-sm text-green-700">
            Your request has been received. We&apos;ll review it shortly.
          </p>
          <div className="mb-6 rounded-xl bg-white p-4 text-left shadow-sm">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Booking ID</span>
                <span className="font-mono font-semibold text-amber-800">
                  {result.bookingId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                  {result.status}
                </span>
              </div>
            </div>
          </div>

          {/* Secret Code Display */}
          <div className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
            <div className="mb-2 flex items-center justify-center gap-2">
              <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm font-semibold text-amber-900">
                Your Secret Code
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="rounded-lg bg-white px-4 py-2 font-mono text-2xl font-bold tracking-widest text-amber-800 shadow-sm">
                {result.secretCode}
              </span>
              <button
                onClick={copySecretCode}
                className="rounded-lg bg-amber-600 p-2 text-white transition-colors hover:bg-amber-700"
                title="Copy to clipboard"
              >
                {codeCopied ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-3 text-xs font-medium text-amber-800">
              Save this code! You&apos;ll need it to access your quotation, discussion, and bill.
            </p>
          </div>

          <p className="mb-4 text-xs text-gray-500">
            Save your Booking ID and Secret Code to track your request status.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/booking-status?id=${result.bookingId}`}
              className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              Track Status
            </Link>
            <button
              onClick={() => {
                setResult(null);
                setSelectedDate(null);
                setFormData({
                  name: "",
                  phone: "",
                  eventType: "",
                  numberOfAttendees: "",
                  notes: "",
                });
              }}
              className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              New Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 text-center sm:mb-10">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-amber-600">
          Reserve Your Date
        </p>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Book Your Event
        </h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-base">
          Select an available date and fill in your details
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        {/* Calendar */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Select a Date
          </h2>
          {calendarLoading ? (
            <div className="flex h-80 items-center justify-center rounded-xl border border-gray-200 bg-white">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
            </div>
          ) : (
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              disabledDates={disabledDates}
            />
          )}
        </div>

        {/* Form */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Event Details
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div>
              <label htmlFor="eventType" className="mb-1.5 block text-sm font-medium text-gray-700">
                Event Type
              </label>
              <select
                id="eventType"
                required
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">Select event type</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="attendees" className="mb-1.5 block text-sm font-medium text-gray-700">
                Number of Attendees
              </label>
              <input
                id="attendees"
                type="number"
                required
                min={1}
                max={2000}
                value={formData.numberOfAttendees}
                onChange={(e) =>
                  setFormData({ ...formData, numberOfAttendees: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="Expected number of guests"
              />
            </div>

            <div>
              <label htmlFor="date-display" className="mb-1.5 block text-sm font-medium text-gray-700">
                Selected Date
              </label>
              <input
                id="date-display"
                type="text"
                readOnly
                value={selectedDate || ""}
                placeholder="Select from calendar"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none"
              />
            </div>

            <div>
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-700">
                Additional Notes <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="Any special requirements..."
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedDate}
              className="w-full rounded-xl bg-amber-600 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-amber-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </span>
              ) : (
                "Submit Booking Request"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
