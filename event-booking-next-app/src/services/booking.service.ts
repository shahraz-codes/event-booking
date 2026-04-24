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
  date: string;
  eventType: string;
  numberOfAttendees: number;
  notes?: string;
}) {
  const bookingId = await generateBookingId();
  const bookingDate = new Date(data.date);
  const secretCode = generateSecretCode();

  return prisma.booking.create({
    data: {
      bookingId,
      name: data.name,
      phone: data.phone,
      date: bookingDate,
      eventType: data.eventType,
      numberOfAttendees: data.numberOfAttendees,
      notes: data.notes || null,
      status: "PENDING",
      secretCode,
    },
    select: {
      bookingId: true,
      name: true,
      date: true,
      eventType: true,
      numberOfAttendees: true,
      status: true,
      secretCode: true,
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
  createdAt: true,
} as const;

const BOOKING_SENSITIVE_SELECT = {
  ...BOOKING_BASIC_SELECT,
  phone: true,
  notes: true,
  totalAmount: true,
  advanceAmount: true,
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

  const { secretCode: _, ...rest } = booking;
  return rest;
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

export async function approveBooking(
  id: string,
  totalAmount: number,
  advanceAmount: number,
  adminNote?: string
) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      select: {
        id: true,
        date: true,
        status: true,
        quotation: { select: { status: true, totalAmount: true, advanceAmount: true } },
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const allowedStatuses: BookingStatus[] = [
      "PENDING",
      "QUOTATION_SENT",
      "QUOTATION_FINALIZED",
    ];
    if (!allowedStatuses.includes(booking.status)) {
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

    return updated;
  });
}

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
        status: "REJECTED",
        adminNote: adminNote || "Cancelled by admin",
      },
    });

    await tx.blockedDate.deleteMany({
      where: { date: booking.date },
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
