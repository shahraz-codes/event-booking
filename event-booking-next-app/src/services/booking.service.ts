import { prisma } from "@/lib/prisma";
import {
  BookingStatus,
  CommentSender,
  QuotationStatus,
} from "@/generated/prisma/client";
import { format } from "date-fns";
import crypto from "crypto";
import type { QuotationItemData } from "@/types";

function generateSecretCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

export async function generateBookingId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BNQ-${year}-`;

  const lastBooking = await prisma.booking.findFirst({
    where: { bookingId: { startsWith: prefix } },
    orderBy: { bookingId: "desc" },
    select: { bookingId: true },
  });

  let nextNumber = 1;
  if (lastBooking) {
    const lastNumber = parseInt(lastBooking.bookingId.split("-")[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

export async function createBooking(data: {
  name: string;
  phone: string;
  email?: string;
  date: string;
  eventType: string;
  numberOfAttendees: number;
  notes?: string;
  notifyViaWhatsapp?: boolean;
  notifyViaEmail?: boolean;
}) {
  const bookingId = await generateBookingId();
  const bookingDate = new Date(data.date);
  const secretCode = generateSecretCode();

  return prisma.booking.create({
    data: {
      bookingId,
      name: data.name,
      phone: data.phone,
      email: data.email?.trim() || null,
      date: bookingDate,
      eventType: data.eventType,
      numberOfAttendees: data.numberOfAttendees,
      notes: data.notes || null,
      status: "PENDING",
      secretCode,
      notifyViaWhatsapp: data.notifyViaWhatsapp ?? false,
      notifyViaEmail: data.notifyViaEmail ?? false,
    },
    select: {
      bookingId: true,
      name: true,
      phone: true,
      email: true,
      date: true,
      eventType: true,
      numberOfAttendees: true,
      status: true,
      secretCode: true,
      notifyViaWhatsapp: true,
      notifyViaEmail: true,
      createdAt: true,
    },
  });
}

const BOOKING_BASIC_SELECT = {
  bookingId: true,
  name: true,
  date: true,
  eventType: true,
  numberOfAttendees: true,
  status: true,
  adminNote: true,
  previousDate: true,
  requestedNewDate: true,
  conflictedAt: true,
  createdAt: true,
} as const;

const BOOKING_SENSITIVE_SELECT = {
  ...BOOKING_BASIC_SELECT,
  phone: true,
  email: true,
  notes: true,
  totalAmount: true,
  advanceAmount: true,
  notifyViaWhatsapp: true,
  notifyViaEmail: true,
  cancellationReason: true,
  cancelledBy: true,
  pendingRequestDecidedAt: true,
  dateChangeReason: true,
  dateChangeAcknowledged: true,
  conflictingBookingId: true,
  conflictWinner: {
    select: {
      bookingId: true,
      name: true,
      date: true,
    },
  },
  comments: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      message: true,
      sender: true,
      createdAt: true,
    },
  },
  quotation: {
    select: {
      id: true,
      status: true,
      totalAmount: true,
      advanceAmount: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      finalizedAt: true,
      items: {
        orderBy: { order: "asc" as const },
        select: {
          id: true,
          particular: true,
          quantity: true,
          unit: true,
          rate: true,
          amount: true,
          order: true,
        },
      },
    },
  },
} as const;

export async function getBookingByBookingId(bookingId: string) {
  return prisma.booking.findUnique({
    where: { bookingId },
    select: BOOKING_BASIC_SELECT,
  });
}

export async function getBookingByBookingIdWithSecret(
  bookingId: string,
  secretCode: string
) {
  const booking = await prisma.booking.findUnique({
    where: { bookingId },
    select: { ...BOOKING_SENSITIVE_SELECT, secretCode: true },
  });

  if (!booking) return null;
  if (booking.secretCode !== secretCode) return null;

  const { secretCode: _secretCode, ...rest } = booking;
  return rest;
}

/**
 * Token-authorised full view (Phase 4 magic-link path).
 * Caller must have already verified the token signature; this just loads
 * the booking by its public bookingId with all sensitive fields included.
 */
export async function getBookingByBookingIdForToken(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { bookingId },
    select: BOOKING_SENSITIVE_SELECT,
  });
  return booking;
}

/**
 * Looks up the internal id + status for a customer-initiated action.
 * Used by /api/bookings/[bookingId]/action to validate `auth` against the
 * booking before routing.
 */
async function authorizeCustomerAccess(
  bookingId: string,
  auth: { token?: string; secretCode?: string }
) {
  const booking = await prisma.booking.findUnique({
    where: { bookingId },
    select: { id: true, secretCode: true, status: true, date: true },
  });
  if (!booking) return null;

  if (auth.secretCode) {
    if (booking.secretCode !== auth.secretCode) return null;
    return booking;
  }
  // token-only callers: the token's signature has already been verified by
  // the route, and the token's bid claim equals bookingId. No extra check.
  if (auth.token) return booking;
  return null;
}

export async function getAllBookings(
  status?: BookingStatus,
  pagination?: { page?: number; pageSize?: number }
) {
  const where = status ? { status } : undefined;

  if (!pagination) {
    return prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ...BOOKING_SENSITIVE_SELECT,
      },
    });
  }

  const page = Math.max(1, pagination.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, pagination.pageSize ?? 10));
  const skip = (page - 1) * pageSize;

  const [total, data] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        ...BOOKING_SENSITIVE_SELECT,
      },
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Statuses on which an admin may issue an `Approve`. These statuses are
 * non-terminal, non-locked-pending-request states.
 */
const APPROVABLE_STATUSES: BookingStatus[] = [
  "PENDING",
  "QUOTATION_SENT",
  "QUOTATION_FINALIZED",
];

/**
 * Statuses that get cascaded to CONFLICTED when another booking on the same
 * date is approved (Phase 4d).
 */
const CASCADE_CANDIDATE_STATUSES: BookingStatus[] = [
  "PENDING",
  "QUOTATION_SENT",
  "QUOTATION_FINALIZED",
  "DATE_CHANGE_REQUESTED",
  "CANCELLATION_REQUESTED",
];

export async function approveBooking(
  id: string,
  totalAmount: number,
  advanceAmount: number,
  adminNote?: string
): Promise<{
  bookingId: string;
  status: BookingStatus;
  cascadedBookingIds: string[];
}> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      select: {
        id: true,
        bookingId: true,
        date: true,
        status: true,
        quotation: { select: { status: true, totalAmount: true, advanceAmount: true } },
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (!APPROVABLE_STATUSES.includes(booking.status)) {
      throw new Error("Booking cannot be approved from its current status");
    }

    const existingApproved = await tx.booking.findFirst({
      where: {
        date: booking.date,
        status: "APPROVED",
        id: { not: id },
      },
    });

    if (existingApproved) {
      throw new Error(
        `Date ${format(booking.date, "yyyy-MM-dd")} already has an approved booking`
      );
    }

    const blockedDate = await tx.blockedDate.findUnique({
      where: { date: booking.date },
    });

    if (blockedDate) {
      throw new Error(
        `Date ${format(booking.date, "yyyy-MM-dd")} is blocked: ${blockedDate.reason || "No reason provided"}`
      );
    }

    const updated = await tx.booking.update({
      where: { id },
      data: {
        status: "APPROVED",
        adminNote: adminNote || null,
        totalAmount,
        advanceAmount,
      },
    });

    if (booking.quotation && booking.quotation.status !== "FINALIZED") {
      await tx.quotation.update({
        where: { bookingId: id },
        data: { status: "FINALIZED", finalizedAt: new Date() },
      });
    }

    await tx.blockedDate.upsert({
      where: { date: booking.date },
      update: { reason: `Booked: ${updated.bookingId}` },
      create: {
        date: booking.date,
        reason: `Booked: ${updated.bookingId}`,
      },
    });

    // Phase 4d - cascade: any other booking on the same date in a non-terminal
    // state is now CONFLICTED.
    const cascadeTargets = await tx.booking.findMany({
      where: {
        date: booking.date,
        id: { not: id },
        status: { in: CASCADE_CANDIDATE_STATUSES },
      },
      select: { id: true, bookingId: true },
    });

    if (cascadeTargets.length > 0) {
      await tx.booking.updateMany({
        where: { id: { in: cascadeTargets.map((b) => b.id) } },
        data: {
          status: "CONFLICTED",
          conflictedAt: new Date(),
          conflictingBookingId: id,
        },
      });

      for (const target of cascadeTargets) {
        await tx.comment.create({
          data: {
            bookingId: target.id,
            sender: "ADMIN",
            message: `Your date is no longer available — booking ${updated.bookingId} was confirmed on the same date.`,
          },
        });
      }
    }

    return {
      bookingId: updated.bookingId,
      status: updated.status,
      cascadedBookingIds: cascadeTargets.map((b) => b.bookingId),
    };
  });
}

/**
 * Detect potential conflicts before actually approving. Used by the
 * admin "review approval" screen (Phase 4d step 12) so admin sees the
 * full list of bookings that will be cascaded.
 */
export async function getPotentialConflicts(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, date: true, status: true, bookingId: true, name: true },
  });
  if (!booking) return null;

  const conflicts = await prisma.booking.findMany({
    where: {
      date: booking.date,
      id: { not: id },
      status: { in: CASCADE_CANDIDATE_STATUSES },
    },
    select: {
      id: true,
      bookingId: true,
      name: true,
      phone: true,
      email: true,
      status: true,
      eventType: true,
      numberOfAttendees: true,
      notifyViaWhatsapp: true,
      notifyViaEmail: true,
      adminNote: true,
      createdAt: true,
      quotation: {
        select: {
          status: true,
          totalAmount: true,
          updatedAt: true,
        },
      },
      comments: {
        orderBy: { createdAt: "desc" as const },
        take: 3,
        select: {
          id: true,
          message: true,
          sender: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return { booking, conflicts };
}

/**
 * Admin force-cancel of an APPROVED booking (was the old `cancelBooking`
 * with REJECTED target).
 */
export async function cancelBooking(id: string, adminNote?: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      select: { id: true, date: true, status: true },
    });

    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "APPROVED") {
      throw new Error("Only approved bookings can be cancelled");
    }

    const updated = await tx.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledBy: "ADMIN",
        cancellationReason: adminNote || null,
        adminNote: adminNote || "Cancelled by admin",
      },
    });

    await tx.blockedDate.deleteMany({
      where: { date: booking.date },
    });

    await tx.comment.create({
      data: {
        bookingId: id,
        sender: "ADMIN",
        message: `Booking cancelled by admin${adminNote ? `: ${adminNote}` : "."}`,
      },
    });

    return updated;
  });
}

export async function rejectBooking(id: string, adminNote?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.status === "APPROVED") {
    throw new Error("Cannot reject an approved booking — cancel it instead");
  }
  if (booking.status === "REJECTED") {
    throw new Error("Booking is already rejected");
  }

  return prisma.booking.update({
    where: { id },
    data: {
      status: "REJECTED",
      adminNote: adminNote || null,
    },
  });
}

// ─── Phase 4b - Customer cancellation ─────────────────────────────────

const DIRECT_CANCELLABLE_STATUSES: BookingStatus[] = [
  "PENDING",
  "QUOTATION_SENT",
  "QUOTATION_FINALIZED",
  "CONFLICTED",
];

/**
 * Customer-initiated cancellation. Routes to direct cancel or to a
 * cancellation request based on the booking's current status.
 *
 * - PENDING/QUOTATION_SENT/QUOTATION_FINALIZED/CONFLICTED → CANCELLED directly
 * - APPROVED → CANCELLATION_REQUESTED (admin must approve)
 */
export async function customerCancelBooking(
  bookingId: string,
  auth: { token?: string; secretCode?: string },
  reason?: string
) {
  const access = await authorizeCustomerAccess(bookingId, auth);
  if (!access) throw new Error("Booking not found or unauthorized");

  if (DIRECT_CANCELLABLE_STATUSES.includes(access.status)) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: access.id },
        data: {
          status: "CANCELLED",
          cancelledBy: "CUSTOMER",
          cancellationReason: reason?.trim() || null,
        },
      });
      await tx.comment.create({
        data: {
          bookingId: access.id,
          sender: "CUSTOMER",
          message: `Booking cancelled${reason ? `: ${reason}` : "."}`,
        },
      });
      return { ...updated, transition: "cancelled" as const };
    });
  }

  if (access.status === "APPROVED") {
    if (!reason || !reason.trim()) {
      throw new Error("A reason is required to request cancellation of an approved booking");
    }
    return prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: access.id },
        data: {
          status: "CANCELLATION_REQUESTED",
          cancellationReason: reason.trim(),
        },
      });
      await tx.comment.create({
        data: {
          bookingId: access.id,
          sender: "CUSTOMER",
          message: `Cancellation requested: ${reason.trim()}`,
        },
      });
      return { ...updated, transition: "cancellation_requested" as const };
    });
  }

  throw new Error("Booking cannot be cancelled from its current status");
}

/**
 * Customer withdraws a pending request (cancellation or date-change),
 * reverting the booking to its previous logical state (APPROVED).
 */
export async function customerWithdrawRequest(
  bookingId: string,
  auth: { token?: string; secretCode?: string }
) {
  const access = await authorizeCustomerAccess(bookingId, auth);
  if (!access) throw new Error("Booking not found or unauthorized");

  if (
    access.status !== "CANCELLATION_REQUESTED" &&
    access.status !== "DATE_CHANGE_REQUESTED"
  ) {
    throw new Error("No pending request to withdraw");
  }

  return prisma.$transaction(async (tx) => {
    const previous = access.status;
    const updated = await tx.booking.update({
      where: { id: access.id },
      data: {
        status: "APPROVED",
        cancellationReason: previous === "CANCELLATION_REQUESTED" ? null : undefined,
        requestedNewDate: previous === "DATE_CHANGE_REQUESTED" ? null : undefined,
        dateChangeReason: previous === "DATE_CHANGE_REQUESTED" ? null : undefined,
      },
    });
    await tx.comment.create({
      data: {
        bookingId: access.id,
        sender: "CUSTOMER",
        message:
          previous === "CANCELLATION_REQUESTED"
            ? "Cancellation request withdrawn."
            : "Date change request withdrawn.",
      },
    });
    return updated;
  });
}

export async function approveCancellationRequest(id: string, adminNote?: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      select: { id: true, status: true, date: true },
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "CANCELLATION_REQUESTED") {
      throw new Error("No cancellation request pending on this booking");
    }

    const updated = await tx.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledBy: "CUSTOMER",
        pendingRequestDecidedAt: new Date(),
        adminNote: adminNote || null,
      },
    });
    await tx.blockedDate.deleteMany({ where: { date: booking.date } });
    await tx.comment.create({
      data: {
        bookingId: id,
        sender: "ADMIN",
        message: `Cancellation request approved${adminNote ? `: ${adminNote}` : "."}`,
      },
    });
    return updated;
  });
}

export async function declineCancellationRequest(id: string, adminNote: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "CANCELLATION_REQUESTED") {
      throw new Error("No cancellation request pending on this booking");
    }

    const updated = await tx.booking.update({
      where: { id },
      data: {
        status: "APPROVED",
        pendingRequestDecidedAt: new Date(),
        adminNote: adminNote || null,
        cancellationReason: null,
      },
    });
    await tx.comment.create({
      data: {
        bookingId: id,
        sender: "ADMIN",
        message: `Cancellation request declined: ${adminNote}`,
      },
    });
    return updated;
  });
}

// ─── Phase 4c - Customer date change ──────────────────────────────────

const DATE_CHANGE_DIRECT_STATUSES: BookingStatus[] = [
  "PENDING",
  "QUOTATION_SENT",
  "QUOTATION_FINALIZED",
];

async function ensureDateFree(
  tx: typeof prisma,
  date: Date,
  excludeBookingId: string
): Promise<void> {
  const collision = await tx.booking.findFirst({
    where: {
      date,
      status: "APPROVED",
      id: { not: excludeBookingId },
    },
    select: { bookingId: true },
  });
  if (collision) {
    throw new Error(
      `Date ${format(date, "yyyy-MM-dd")} is already approved for ${collision.bookingId}`
    );
  }

  const blocked = await tx.blockedDate.findUnique({
    where: { date },
  });
  // BlockedDate rows can be admin-blocked OR auto-blocked due to approved
  // bookings. The approved-booking check above covers the latter; here we
  // reject only admin-blocked dates. We distinguish them by the reason
  // prefix "Booked: <bookingId>" inserted by approveBooking.
  if (blocked && !blocked.reason?.startsWith("Booked:")) {
    throw new Error(
      `Date ${format(date, "yyyy-MM-dd")} is blocked: ${blocked.reason || "no reason"}`
    );
  }
}

/**
 * Customer-initiated date change. Routes based on current status:
 * - PENDING/QUOTATION_SENT/QUOTATION_FINALIZED → direct date swap
 * - APPROVED → DATE_CHANGE_REQUESTED (admin must approve)
 * - CONFLICTED → see customerPickNewDateForConflicted
 */
export async function customerChangeDate(
  bookingId: string,
  auth: { token?: string; secretCode?: string },
  newDateStr: string,
  reason?: string
) {
  const access = await authorizeCustomerAccess(bookingId, auth);
  if (!access) throw new Error("Booking not found or unauthorized");

  const newDate = new Date(newDateStr);
  if (Number.isNaN(newDate.getTime())) throw new Error("Invalid date");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (newDate < today) throw new Error("New date must be in the future");
  if (newDate.getTime() === access.date.getTime()) {
    throw new Error("New date is the same as the current date");
  }

  if (DATE_CHANGE_DIRECT_STATUSES.includes(access.status)) {
    return prisma.$transaction(async (tx) => {
      await ensureDateFree(tx as unknown as typeof prisma, newDate, access.id);
      const updated = await tx.booking.update({
        where: { id: access.id },
        data: {
          date: newDate,
          previousDate: access.date,
          dateChangeAcknowledged: false,
          dateChangeReason: reason?.trim() || null,
        },
      });
      await tx.comment.create({
        data: {
          bookingId: access.id,
          sender: "CUSTOMER",
          message: `Event date changed from ${format(access.date, "MMM d, yyyy")} to ${format(newDate, "MMM d, yyyy")}${reason ? ` — ${reason}` : ""}.`,
        },
      });
      return { ...updated, transition: "date_changed" as const };
    });
  }

  if (access.status === "APPROVED") {
    if (!reason || !reason.trim()) {
      throw new Error("A reason is required to request a date change for an approved booking");
    }
    return prisma.$transaction(async (tx) => {
      await ensureDateFree(tx as unknown as typeof prisma, newDate, access.id);
      const updated = await tx.booking.update({
        where: { id: access.id },
        data: {
          status: "DATE_CHANGE_REQUESTED",
          requestedNewDate: newDate,
          dateChangeReason: reason.trim(),
        },
      });
      await tx.comment.create({
        data: {
          bookingId: access.id,
          sender: "CUSTOMER",
          message: `Date change requested: ${format(access.date, "MMM d, yyyy")} → ${format(newDate, "MMM d, yyyy")} (${reason.trim()})`,
        },
      });
      return { ...updated, transition: "date_change_requested" as const };
    });
  }

  throw new Error("Date cannot be changed from the current booking status");
}

export async function approveDateChange(id: string, adminNote?: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      select: {
        id: true,
        bookingId: true,
        date: true,
        status: true,
        requestedNewDate: true,
      },
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "DATE_CHANGE_REQUESTED" || !booking.requestedNewDate) {
      throw new Error("No date change request pending on this booking");
    }

    const oldDate = booking.date;
    const newDate = booking.requestedNewDate;

    await ensureDateFree(tx as unknown as typeof prisma, newDate, id);

    const updated = await tx.booking.update({
      where: { id },
      data: {
        status: "APPROVED",
        date: newDate,
        previousDate: oldDate,
        dateChangeAcknowledged: true,
        requestedNewDate: null,
        pendingRequestDecidedAt: new Date(),
        adminNote: adminNote || null,
      },
    });

    await tx.blockedDate.deleteMany({ where: { date: oldDate } });
    await tx.blockedDate.upsert({
      where: { date: newDate },
      update: { reason: `Booked: ${updated.bookingId}` },
      create: {
        date: newDate,
        reason: `Booked: ${updated.bookingId}`,
      },
    });

    await tx.comment.create({
      data: {
        bookingId: id,
        sender: "ADMIN",
        message: `Date change approved: ${format(oldDate, "MMM d, yyyy")} → ${format(newDate, "MMM d, yyyy")}${adminNote ? ` (${adminNote})` : "."}`,
      },
    });

    // Phase 4d cascade: any other booking that wanted the new date now
    // gets bumped to CONFLICTED.
    const cascadeTargets = await tx.booking.findMany({
      where: {
        date: newDate,
        id: { not: id },
        status: { in: CASCADE_CANDIDATE_STATUSES },
      },
      select: { id: true, bookingId: true },
    });
    if (cascadeTargets.length > 0) {
      await tx.booking.updateMany({
        where: { id: { in: cascadeTargets.map((b) => b.id) } },
        data: {
          status: "CONFLICTED",
          conflictedAt: new Date(),
          conflictingBookingId: id,
        },
      });
      for (const target of cascadeTargets) {
        await tx.comment.create({
          data: {
            bookingId: target.id,
            sender: "ADMIN",
            message: `Your date is no longer available — booking ${updated.bookingId} was confirmed on the same date.`,
          },
        });
      }
    }

    return {
      booking: updated,
      cascadedBookingIds: cascadeTargets.map((b) => b.bookingId),
    };
  });
}

export async function declineDateChange(id: string, adminNote: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      select: { id: true, status: true, date: true, requestedNewDate: true },
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "DATE_CHANGE_REQUESTED") {
      throw new Error("No date change request pending on this booking");
    }

    const updated = await tx.booking.update({
      where: { id },
      data: {
        status: "APPROVED",
        requestedNewDate: null,
        dateChangeReason: null,
        pendingRequestDecidedAt: new Date(),
        adminNote: adminNote || null,
      },
    });
    await tx.comment.create({
      data: {
        bookingId: id,
        sender: "ADMIN",
        message: `Date change request declined: ${adminNote}`,
      },
    });
    return updated;
  });
}

export async function acknowledgeDateChange(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, previousDate: true },
  });
  if (!booking) throw new Error("Booking not found");
  if (!booking.previousDate) return booking;

  return prisma.booking.update({
    where: { id },
    data: { previousDate: null, dateChangeAcknowledged: true },
  });
}

// ─── Phase 4d - Cascade conflict resolution ───────────────────────────

/**
 * From a CONFLICTED booking, the customer picks a new date and re-enters
 * the workflow as PENDING.
 */
export async function customerPickNewDateForConflicted(
  bookingId: string,
  auth: { token?: string; secretCode?: string },
  newDateStr: string,
  reason?: string
) {
  const access = await authorizeCustomerAccess(bookingId, auth);
  if (!access) throw new Error("Booking not found or unauthorized");
  if (access.status !== "CONFLICTED") {
    throw new Error("This booking is not in a conflicted state");
  }

  const newDate = new Date(newDateStr);
  if (Number.isNaN(newDate.getTime())) throw new Error("Invalid date");

  return prisma.$transaction(async (tx) => {
    await ensureDateFree(tx as unknown as typeof prisma, newDate, access.id);
    const updated = await tx.booking.update({
      where: { id: access.id },
      data: {
        status: "PENDING",
        date: newDate,
        previousDate: access.date,
        dateChangeAcknowledged: false,
        conflictedAt: null,
        // keep conflictingBookingId for audit history
      },
    });
    await tx.comment.create({
      data: {
        bookingId: access.id,
        sender: "CUSTOMER",
        message: `New date picked after conflict: ${format(newDate, "MMM d, yyyy")}${reason ? ` — ${reason}` : ""}.`,
      },
    });
    return updated;
  });
}

/**
 * Admin overrides on a CONFLICTED booking - either force-cancel it or
 * reset it back to PENDING (typically after coordinating off-platform
 * with the customer and getting a new date).
 */
export async function forceResolveConflict(
  id: string,
  action: "force_cancel" | "reset_to_pending",
  options: { newDate?: string; adminNote?: string }
) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, status: true, date: true },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "CONFLICTED") {
    throw new Error("Booking is not in a conflicted state");
  }

  if (action === "force_cancel") {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledBy: "ADMIN",
          cancellationReason: options.adminNote || "Cancelled by admin",
          adminNote: options.adminNote || null,
        },
      });
      await tx.comment.create({
        data: {
          bookingId: id,
          sender: "ADMIN",
          message: `Conflict resolved by admin cancellation${options.adminNote ? `: ${options.adminNote}` : "."}`,
        },
      });
      return updated;
    });
  }

  // reset_to_pending
  if (!options.newDate) {
    throw new Error("A new date is required when resetting a conflicted booking to pending");
  }
  const newDate = new Date(options.newDate);
  if (Number.isNaN(newDate.getTime())) throw new Error("Invalid date");

  return prisma.$transaction(async (tx) => {
    await ensureDateFree(tx as unknown as typeof prisma, newDate, id);
    const updated = await tx.booking.update({
      where: { id },
      data: {
        status: "PENDING",
        date: newDate,
        previousDate: booking.date,
        dateChangeAcknowledged: false,
        conflictedAt: null,
        adminNote: options.adminNote || null,
      },
    });
    await tx.comment.create({
      data: {
        bookingId: id,
        sender: "ADMIN",
        message: `Conflict resolved — date reset to ${format(newDate, "MMM d, yyyy")} by admin${options.adminNote ? ` (${options.adminNote})` : "."}`,
      },
    });
    return updated;
  });
}

// ─── Quotation CRUD ──────────────────────────────────────────

export async function createQuotation(
  bookingId: string,
  items: QuotationItemData[],
  advanceAmount: number = 0,
  notes?: string
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, quotation: { select: { id: true } } },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.quotation) throw new Error("Quotation already exists for this booking");

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return prisma.quotation.create({
    data: {
      bookingId,
      totalAmount,
      advanceAmount,
      notes: notes || null,
      items: {
        create: items.map((item, idx) => ({
          particular: item.particular,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          rate: item.rate ?? null,
          amount: item.amount || 0,
          order: item.order ?? idx,
        })),
      },
    },
    include: {
      items: { orderBy: { order: "asc" } },
    },
  });
}

export async function updateQuotation(
  quotationId: string,
  items: QuotationItemData[],
  advanceAmount?: number,
  notes?: string
) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: { id: true, status: true },
  });

  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status === "FINALIZED") {
    throw new Error("Cannot edit a finalized quotation");
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return prisma.$transaction(async (tx) => {
    await tx.quotationItem.deleteMany({ where: { quotationId } });

    return tx.quotation.update({
      where: { id: quotationId },
      data: {
        totalAmount,
        advanceAmount: advanceAmount ?? undefined,
        notes: notes !== undefined ? notes || null : undefined,
        items: {
          create: items.map((item, idx) => ({
            particular: item.particular,
            quantity: item.quantity ?? null,
            unit: item.unit ?? null,
            rate: item.rate ?? null,
            amount: item.amount || 0,
            order: item.order ?? idx,
          })),
        },
      },
      include: {
        items: { orderBy: { order: "asc" } },
      },
    });
  });
}

export async function sendQuotation(quotationId: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: { id: true, status: true, bookingId: true },
  });

  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status === "FINALIZED") {
    throw new Error("Quotation is already finalized");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.quotation.update({
      where: { id: quotationId },
      data: { status: "SENT" },
      include: { items: { orderBy: { order: "asc" } } },
    });

    await tx.booking.update({
      where: { id: quotation.bookingId },
      data: { status: "QUOTATION_SENT" },
    });

    return updated;
  });
}

export async function finalizeQuotation(quotationId: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: { id: true, status: true, bookingId: true },
  });

  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status === "FINALIZED") {
    throw new Error("Quotation is already finalized");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.quotation.update({
      where: { id: quotationId },
      data: {
        status: "FINALIZED",
        finalizedAt: new Date(),
      },
      include: { items: { orderBy: { order: "asc" } } },
    });

    await tx.booking.update({
      where: { id: quotation.bookingId },
      data: {
        status: "QUOTATION_FINALIZED",
        totalAmount: updated.totalAmount,
        advanceAmount: updated.advanceAmount,
      },
    });

    return updated;
  });
}

export async function getQuotationByBookingInternalId(bookingId: string) {
  return prisma.quotation.findUnique({
    where: { bookingId },
    include: {
      items: { orderBy: { order: "asc" } },
    },
  });
}

// ─── Comments ────────────────────────────────────────────────

export async function addComment(
  bookingId: string,
  message: string,
  sender: CommentSender
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true },
  });

  if (!booking) throw new Error("Booking not found");

  return prisma.comment.create({
    data: {
      bookingId,
      message,
      sender,
    },
    select: {
      id: true,
      message: true,
      sender: true,
      createdAt: true,
    },
  });
}

export async function addCommentByBookingId(
  bookingId: string,
  secretCode: string,
  message: string,
  sender: CommentSender
) {
  const booking = await prisma.booking.findUnique({
    where: { bookingId },
    select: { id: true, secretCode: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.secretCode !== secretCode)
    throw new Error("Invalid secret code");

  return prisma.comment.create({
    data: {
      bookingId: booking.id,
      message,
      sender,
    },
    select: {
      id: true,
      message: true,
      sender: true,
      createdAt: true,
    },
  });
}

export async function getComments(bookingId: string) {
  return prisma.comment.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      message: true,
      sender: true,
      createdAt: true,
    },
  });
}

export async function getCommentsByBookingId(
  bookingId: string,
  secretCode: string
) {
  const booking = await prisma.booking.findUnique({
    where: { bookingId },
    select: { id: true, secretCode: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.secretCode !== secretCode)
    throw new Error("Invalid secret code");

  return prisma.comment.findMany({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      message: true,
      sender: true,
      createdAt: true,
    },
  });
}
