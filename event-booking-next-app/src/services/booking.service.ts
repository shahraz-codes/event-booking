import { prisma } from "@/lib/prisma";
import { BookingStatus, CommentSender } from "@/generated/prisma/client";
import { format } from "date-fns";

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
  notes?: string;
}) {
  const bookingId = await generateBookingId();
  const bookingDate = new Date(data.date);

  return prisma.booking.create({
    data: {
      bookingId,
      name: data.name,
      phone: data.phone,
      date: bookingDate,
      eventType: data.eventType,
      notes: data.notes || null,
      status: "PENDING",
    },
    select: {
      bookingId: true,
      name: true,
      date: true,
      eventType: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function getBookingByBookingId(bookingId: string) {
  return prisma.booking.findUnique({
    where: { bookingId },
    select: {
      bookingId: true,
      name: true,
      phone: true,
      date: true,
      eventType: true,
      notes: true,
      status: true,
      adminNote: true,
      totalAmount: true,
      advanceAmount: true,
      createdAt: true,
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          message: true,
          sender: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function getAllBookings(status?: BookingStatus) {
  return prisma.booking.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      bookingId: true,
      name: true,
      phone: true,
      date: true,
      eventType: true,
      notes: true,
      status: true,
      adminNote: true,
      totalAmount: true,
      advanceAmount: true,
      createdAt: true,
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          message: true,
          sender: true,
          createdAt: true,
        },
      },
    },
  });
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
      select: { id: true, date: true, status: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "PENDING") {
      throw new Error("Only pending bookings can be approved");
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
  if (booking.status !== "PENDING") {
    throw new Error("Only pending bookings can be rejected");
  }

  return prisma.booking.update({
    where: { id },
    data: {
      status: "REJECTED",
      adminNote: adminNote || null,
    },
  });
}

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
  phone: string,
  message: string,
  sender: CommentSender
) {
  const booking = await prisma.booking.findUnique({
    where: { bookingId },
    select: { id: true, phone: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.phone !== phone) throw new Error("Phone number does not match");

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

export async function getCommentsByBookingId(bookingId: string, phone: string) {
  const booking = await prisma.booking.findUnique({
    where: { bookingId },
    select: { id: true, phone: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.phone !== phone) throw new Error("Phone number does not match");

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
