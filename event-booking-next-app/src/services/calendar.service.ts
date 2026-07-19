import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/generated/prisma/client";
import { format } from "date-fns";

export async function getCalendarData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [approvedBookings, blockedDates] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: "APPROVED",
        date: { gte: today },
      },
      select: { date: true },
    }),
    prisma.blockedDate.findMany({
      where: {
        date: { gte: today },
      },
      select: { date: true },
    }),
  ]);

  const bookedDateStrings = approvedBookings.map((b: { date: Date }) =>
    format(b.date, "yyyy-MM-dd")
  );
  const blockedDateStrings = blockedDates.map((d: { date: Date }) =>
    format(d.date, "yyyy-MM-dd")
  );

  return {
    bookedDates: bookedDateStrings,
    blockedDates: blockedDateStrings,
  };
}

// ── Feature 3: admin calendar tooltip data ──────────────────────────────────
// Per-date index of booking IDs, split into confirmed (APPROVED) and
// un-approved / in-progress. Consumed ONLY by the admin-gated
// GET /api/admin/calendar route — never exposed on the public /api/calendar.

export interface CalendarDateBookings {
  approved: string[]; // booking IDs with status APPROVED
  pending: string[]; // booking IDs with any in-progress status
}
export type CalendarBookingsIndex = Record<string, CalendarDateBookings>;

// Statuses that count as "un-approved but active" for a date. Excludes the
// terminal states REJECTED and CANCELLED.
const IN_PROGRESS_STATUSES: BookingStatus[] = [
  "PENDING",
  "QUOTATION_SENT",
  "QUOTATION_FINALIZED",
  "CANCELLATION_REQUESTED",
  "DATE_CHANGE_REQUESTED",
  "CONFLICTED",
];

export async function getCalendarBookingsIndex(): Promise<CalendarBookingsIndex> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await prisma.booking.findMany({
    where: {
      date: { gte: today },
      status: { in: ["APPROVED", ...IN_PROGRESS_STATUSES] },
    },
    select: { bookingId: true, status: true, date: true },
    orderBy: { createdAt: "asc" },
  });

  const index: CalendarBookingsIndex = {};
  for (const row of rows) {
    const key = format(row.date, "yyyy-MM-dd");
    const bucket = (index[key] ??= { approved: [], pending: [] });
    if (row.status === "APPROVED") bucket.approved.push(row.bookingId);
    else bucket.pending.push(row.bookingId);
  }
  return index;
}

export async function addBlockedDate(date: string, reason?: string) {
  const dateObj = new Date(date);

  const existingBooking = await prisma.booking.findFirst({
    where: {
      date: dateObj,
      status: "APPROVED",
    },
  });

  if (existingBooking) {
    throw new Error("Cannot block a date that has an approved booking");
  }

  return prisma.blockedDate.upsert({
    where: { date: dateObj },
    update: { reason: reason || null },
    create: { date: dateObj, reason: reason || null },
  });
}

export async function removeBlockedDate(id: string) {
  const blockedDate = await prisma.blockedDate.findUnique({ where: { id } });
  if (!blockedDate) throw new Error("Blocked date not found");

  const approvedBooking = await prisma.booking.findFirst({
    where: {
      date: blockedDate.date,
      status: "APPROVED",
    },
  });

  if (approvedBooking) {
    throw new Error(
      "Cannot remove a blocked date tied to an approved booking. Cancel the booking instead."
    );
  }

  return prisma.blockedDate.delete({ where: { id } });
}

export async function getBlockedDates() {
  return prisma.blockedDate.findMany({
    orderBy: { date: "asc" },
  });
}
