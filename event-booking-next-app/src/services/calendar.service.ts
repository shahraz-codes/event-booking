import { prisma } from "@/lib/prisma";
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
  return prisma.blockedDate.delete({ where: { id } });
}

export async function getBlockedDates() {
  return prisma.blockedDate.findMany({
    orderBy: { date: "asc" },
  });
}
