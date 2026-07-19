"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";

// Feature 3: optional per-date booking info. Only the admin dashboard passes
// this; the customer booking page omits it, so no booking IDs are ever shown
// or fetched on the public site.
export interface CalendarDateBookings {
  approved: string[];
  pending: string[];
}

interface CalendarProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  disabledDates?: string[];
  readOnly?: boolean;
  dateInfo?: Record<string, CalendarDateBookings>;
  /** UX-6: optional feedback when the user taps an unavailable day. */
  onDisabledDateClick?: (date: string) => void;
}

export default function Calendar({
  selectedDate,
  onDateSelect,
  disabledDates = [],
  readOnly = false,
  dateInfo,
  onDisabledDateClick,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hovered, setHovered] = useState<string | null>(null);
  const today = startOfDay(new Date());

  const disabledSet = new Set(disabledDates);

  const clearHover = (dateStr: string) =>
    setHovered((d) => (d === dateStr ? null : d));

  const renderHeader = () => (
    <div className="mb-4 flex items-center justify-between">
      <button
        type="button"
        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        aria-label="Previous month"
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h3 className="text-lg font-semibold text-gray-900">
        {format(currentMonth, "MMMM yyyy")}
      </h3>
      <button
        type="button"
        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        aria-label="Next month"
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );

  const renderDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className="mb-2 grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const rows: React.ReactElement[] = [];
    let days: React.ReactElement[] = [];
    let day = calStart;

    while (day <= calEnd) {
      for (let i = 0; i < 7; i++) {
        const dateStr = format(day, "yyyy-MM-dd");
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, today);
        const isPast = isBefore(day, today);
        const isDisabled = disabledSet.has(dateStr) || isPast;
        const isSelected = selectedDate === dateStr;

        const cellDay = day;

        const info = dateInfo?.[dateStr];
        const hasInfo =
          !!info && (info.approved.length > 0 || info.pending.length > 0);
        // Amber marker only for dates that carry in-progress bookings but are
        // not already flagged as unavailable (which show the red dot below).
        const showPendingMarker =
          !!info &&
          info.pending.length > 0 &&
          info.approved.length === 0 &&
          isCurrentMonth &&
          !isDisabled;

        days.push(
          // Handlers live on this non-disabled wrapper so that hovering a
          // DISABLED (approved/blocked) day button still triggers the tooltip —
          // disabled buttons don't reliably emit mouse events in all browsers.
          <div
            key={dateStr}
            className="relative"
            onMouseEnter={() => hasInfo && setHovered(dateStr)}
            onMouseLeave={() => clearHover(dateStr)}
            onClick={() => {
              if (isDisabled && !readOnly && onDisabledDateClick && isCurrentMonth) {
                onDisabledDateClick(dateStr);
              }
            }}
          >
            <button
              type="button"
              disabled={isDisabled || readOnly}
              onClick={() => !isDisabled && !readOnly && onDateSelect(dateStr)}
              onFocus={() => hasInfo && setHovered(dateStr)}
              onBlur={() => clearHover(dateStr)}
              aria-label={format(cellDay, "EEEE, MMMM d, yyyy")}
              className={`relative aspect-square w-full rounded-lg p-1 text-sm font-medium transition-all ${
                !isCurrentMonth
                  ? "text-gray-300"
                  : isSelected
                    ? "bg-brand-600 text-white shadow-md"
                    : isDisabled
                      ? "cursor-not-allowed bg-red-50 text-red-300 line-through"
                      : "text-gray-700 hover:bg-brand-100 hover:text-brand-900"
              } ${isToday && !isSelected ? "ring-2 ring-brand-400" : ""}`}
            >
              {format(cellDay, "d")}
              {isDisabled && isCurrentMonth && !isPast && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-400" />
              )}
              {showPendingMarker && (
                <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
            </button>

            {hovered === dateStr && hasInfo && (
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-left text-xs leading-relaxed text-white shadow-lg"
              >
                {info!.approved.length > 0 && (
                  <div>
                    <span className="font-semibold text-green-300">Booked:</span>{" "}
                    {info!.approved.join(", ")}
                  </div>
                )}
                {info!.pending.length > 0 && (
                  <div>
                    <span className="font-semibold text-amber-300">Pending:</span>{" "}
                    {info!.pending.join(", ")}
                  </div>
                )}
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="space-y-1">{rows}</div>;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-red-50 border border-red-200" />
          Unavailable
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-brand-600" />
          Selected
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded ring-2 ring-brand-400" />
          Today
        </div>
        {/* Only meaningful in the admin view (where dateInfo is provided). */}
        {dateInfo && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            Pending request
          </div>
        )}
      </div>
    </div>
  );
}

export function useCalendarData() {
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar");
      const json = await res.json();
      if (json.success) {
        const all = [...json.data.bookedDates, ...json.data.blockedDates];
        setDisabledDates([...new Set<string>(all)]);
      }
    } catch (err) {
      console.error("Failed to fetch calendar:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
    const interval = setInterval(fetchCalendar, 45000);
    return () => clearInterval(interval);
  }, [fetchCalendar]);

  return { disabledDates, loading, refetch: fetchCalendar };
}
