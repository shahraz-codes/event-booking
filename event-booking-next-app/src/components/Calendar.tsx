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

interface CalendarProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  disabledDates?: string[];
  readOnly?: boolean;
}

export default function Calendar({
  selectedDate,
  onDateSelect,
  disabledDates = [],
  readOnly = false,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfDay(new Date());

  const disabledSet = new Set(disabledDates);

  const renderHeader = () => (
    <div className="mb-4 flex items-center justify-between">
      <button
        type="button"
        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
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

        days.push(
          <button
            key={dateStr}
            type="button"
            disabled={isDisabled || readOnly}
            onClick={() => !isDisabled && !readOnly && onDateSelect(dateStr)}
            className={`relative aspect-square rounded-lg p-1 text-sm font-medium transition-all ${
              !isCurrentMonth
                ? "text-gray-300"
                : isSelected
                  ? "bg-amber-600 text-white shadow-md"
                  : isDisabled
                    ? "cursor-not-allowed bg-red-50 text-red-300 line-through"
                    : "text-gray-700 hover:bg-amber-100 hover:text-amber-900"
            } ${isToday && !isSelected ? "ring-2 ring-amber-400" : ""}`}
          >
            {format(cellDay, "d")}
            {isDisabled && isCurrentMonth && !isPast && (
              <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-400" />
            )}
          </button>
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
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-red-50 border border-red-200" />
          Unavailable
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-amber-600" />
          Selected
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded ring-2 ring-amber-400" />
          Today
        </div>
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
        const all = [
          ...json.data.bookedDates,
          ...json.data.blockedDates,
        ];
        setDisabledDates([...new Set(all)]);
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
