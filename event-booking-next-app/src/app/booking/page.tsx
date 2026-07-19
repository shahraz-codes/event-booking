"use client";

import { useEffect, useState, FormEvent } from "react";
import Calendar, { useCalendarData } from "@/components/Calendar";
import PhoneField from "@/components/PhoneField";
import BookingQRCode from "@/components/BookingQRCode";
import { EVENT_TYPES, bookingSchema, getZodErrorMessage } from "@/types";
import Link from "next/link";

interface BookingResult {
  bookingId: string;
  name: string;
  phone: string;
  email: string | null;
  date: string;
  eventType: string;
  status: string;
  secretCode: string;
  notifyViaWhatsapp: boolean;
  notifyViaEmail: boolean;
  magicLinkToken: string;
}

export default function BookingPage() {
  const { disabledDates, loading: calendarLoading } = useCalendarData();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    eventType: "",
    numberOfAttendees: "",
    notes: "",
  });
  const [notifyViaWhatsapp, setNotifyViaWhatsapp] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      eventType: formData.eventType,
      notes: formData.notes,
      date: selectedDate,
      numberOfAttendees: parseInt(formData.numberOfAttendees, 10) || 0,
      notifyViaWhatsapp,
      // Email opt-in checkbox is hidden for now (Phase 8 v2 not shipped yet).
      // Always submit false so customers don't silently opt in to a channel
      // that doesn't deliver.
      notifyViaEmail: false,
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

  const buildStatusUrl = (token: string) => {
    if (typeof window === "undefined") return `/booking-status?token=${token}`;
    return `${window.location.origin}/booking-status?token=${token}`;
  };

  const copyStatusLink = async () => {
    if (!result?.magicLinkToken) return;
    try {
      await navigator.clipboard.writeText(buildStatusUrl(result.magicLinkToken));
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const buildWhatsAppShareUrl = () => {
    if (!result) return "";
    // E.164-ish: strip non-digits. wa.me does not allow '+' / spaces.
    const phone = result.phone.replace(/[^\d]/g, "");
    const link = buildStatusUrl(result.magicLinkToken);
    const text = `Hi ${result.name}, here's the secure link to track your AR Banquets booking ${result.bookingId} and chat with us: ${link}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
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
                <span className="font-mono font-semibold text-brand-800">
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
          <div className="mb-6 rounded-xl border-2 border-brand-300 bg-brand-50 p-4">
            <div className="mb-2 flex items-center justify-center gap-2">
              <svg className="h-5 w-5 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm font-semibold text-brand-900">
                Your Secret Code
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="rounded-lg bg-white px-4 py-2 font-mono text-2xl font-bold tracking-widest text-brand-800 shadow-sm">
                {result.secretCode}
              </span>
              <button
                onClick={copySecretCode}
                className="rounded-lg bg-brand-600 p-2 text-white transition-colors hover:bg-brand-700"
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
            <p className="mt-3 text-xs font-medium text-brand-800">
              Save this code! You&apos;ll need it to access your quotation, discussion, and bill.
            </p>
          </div>

          {/* Magic-link CTA panel (Phase 7 v1) */}
          <div className="mb-6 rounded-xl border border-brand-200 bg-white p-4 text-left">
            <p className="mb-3 text-sm font-semibold text-brand-900">
              Save your private status link
            </p>
            <p className="mb-3 text-xs text-gray-600">
              This personal link opens your booking, chat with us, and update
              your booking — no login needed. Keep it safe.
            </p>
            <div className="mb-3 flex justify-center">
              <BookingQRCode
                value={buildStatusUrl(result.magicLinkToken)}
                fileName={`${result.bookingId}-qr.png`}
              />
            </div>
            <div className="mb-3 flex items-center gap-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="flex-1 truncate font-mono text-xs text-gray-700">
                {buildStatusUrl(result.magicLinkToken)}
              </span>
              <button
                onClick={copyStatusLink}
                className="shrink-0 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700"
              >
                {linkCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            {result.notifyViaWhatsapp && (
              <a
                href={buildWhatsAppShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1DA851]"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.521.074-.793.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413z" />
                </svg>
                Open in WhatsApp
              </a>
            )}
          </div>

          <p className="mb-4 text-xs text-gray-500">
            (Or use the Booking ID + Secret Code above on the Check Status page.)
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/booking-status?token=${result.magicLinkToken}`}
              className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              Open My Booking
            </Link>
            <button
              onClick={() => {
                setResult(null);
                setSelectedDate(null);
                setFormData({
                  name: "",
                  phone: "",
                  email: "",
                  eventType: "",
                  numberOfAttendees: "",
                  notes: "",
                });
                setNotifyViaWhatsapp(true);
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
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-600">
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
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
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
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                placeholder="Your full name"
              />
            </div>

            <PhoneField
              label="Phone Number"
              value={formData.phone || null}
              onChange={(v) => setFormData({ ...formData, phone: v ?? "" })}
              storageFormat="pretty"
              required
              id="phone"
            />

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                placeholder="you@example.com"
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
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
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
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
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
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                placeholder="Any special requirements..."
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <input
                  id="notifyViaWhatsapp"
                  type="checkbox"
                  checked={notifyViaWhatsapp}
                  onChange={(e) => setNotifyViaWhatsapp(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <label
                  htmlFor="notifyViaWhatsapp"
                  className="cursor-pointer text-sm text-gray-700"
                >
                  Notify me about booking updates on WhatsApp
                </label>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                We respect your preference for routine updates. However, we
                will still contact you via WhatsApp about{" "}
                <strong>critical changes</strong> to your booking (e.g. if your
                date becomes unavailable due to another confirmed booking).
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedDate}
              className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
