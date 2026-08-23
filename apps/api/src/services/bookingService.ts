import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { HttpError } from "../utils/asyncHandler";
import { env } from "../config/env";
import type { BookingRecord, BookingSlot } from "@flexdesk/shared";

function toBookingRecord(b: {
  id: string;
  deskId: string;
  desk: { label: string };
  userId: string;
  user: { name: string };
  date: Date;
  slot: string;
  status: string;
  checkInBy: Date;
  checkedInAt: Date | null;
}): BookingRecord {
  return {
    id: b.id,
    deskId: b.deskId,
    deskLabel: b.desk.label,
    userId: b.userId,
    userName: b.user.name,
    date: b.date.toISOString().slice(0, 10),
    slot: b.slot as BookingSlot,
    status: b.status as BookingRecord["status"],
    checkInBy: b.checkInBy.toISOString(),
    checkedInAt: b.checkedInAt ? b.checkedInAt.toISOString() : null,
  };
}

// A FULL_DAY booking blocks MORNING/AFTERNOON on the same desk/date and vice
// versa — the DB's (deskId, date, slot) unique index alone can't express
// that overlap, so it's enforced here inside the transaction.
async function assertSlotFree(
  tx: Prisma.TransactionClient,
  deskId: string,
  date: Date,
  slot: BookingSlot
) {
  const conflicting = await tx.booking.findMany({
    where: {
      deskId,
      date,
      status: { not: "CANCELLED" },
      OR: [{ slot: "FULL_DAY" }, { slot }],
    },
    select: { id: true },
  });
  if (conflicting.length > 0) {
    throw new HttpError(409, "That desk is already booked for the requested slot");
  }
}

function checkInDeadlineFor(date: Date): Date {
  const deadline = new Date(date);
  deadline.setUTCHours(9, 0, 0, 0);
  deadline.setUTCMinutes(deadline.getUTCMinutes() + env.checkinGraceMinutes);
  return deadline;
}

export async function bookDeskInstant(params: {
  companyId: string;
  userId: string;
  deskId: string;
  date: string;
  slot: BookingSlot;
}): Promise<BookingRecord> {
  const date = new Date(`${params.date}T00:00:00.000Z`);

  const desk = await prisma.desk.findFirst({
    where: { id: params.deskId, floor: { building: { companyId: params.companyId } } },
  });
  if (!desk) throw new HttpError(404, "Desk not found");

  const booking = await prisma.$transaction(async (tx) => {
    await assertSlotFree(tx, params.deskId, date, params.slot);
    return tx.booking.create({
      data: {
        companyId: params.companyId,
        deskId: params.deskId,
        userId: params.userId,
        date,
        slot: params.slot,
        status: "PENDING_CHECKIN",
        checkInBy: checkInDeadlineFor(date),
      },
      include: { desk: true, user: true },
    });
  });

  return toBookingRecord(booking);
}

export async function cancelBooking(companyId: string, userId: string, bookingId: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, companyId } });
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.userId !== userId) throw new HttpError(403, "You can only cancel your own booking");

  await prisma.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
}

export async function checkIn(companyId: string, userId: string, bookingId: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, companyId } });
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.userId !== userId) throw new HttpError(403, "You can only check in to your own booking");
  if (booking.status !== "PENDING_CHECKIN") {
    throw new HttpError(409, `Cannot check in from status ${booking.status}`);
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
    include: { desk: true, user: true },
  });
  return toBookingRecord(updated);
}

// --- Recurring Booking Compiler ---------------------------------------
//
// Expands a date range + weekday pattern into individual Booking rows,
// skipping (rather than failing the whole batch on) any day where the desk
// is already taken. This runs inside one transaction so a partially applied
// recurring lease can never exist in the database.
export async function compileRecurringBooking(params: {
  companyId: string;
  userId: string;
  deskId: string;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  slot: BookingSlot;
}) {
  const start = new Date(`${params.startDate}T00:00:00.000Z`);
  const end = new Date(`${params.endDate}T00:00:00.000Z`);
  if (end < start) throw new HttpError(400, "endDate must be on or after startDate");

  const maxSpanDays = 180;
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (spanDays > maxSpanDays) {
    throw new HttpError(400, `Recurring bookings are capped at ${maxSpanDays} days`);
  }

  const desk = await prisma.desk.findFirst({
    where: { id: params.deskId, floor: { building: { companyId: params.companyId } } },
  });
  if (!desk) throw new HttpError(404, "Desk not found");

  const occurrenceDates: Date[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (params.daysOfWeek.includes(cursor.getUTCDay())) {
      occurrenceDates.push(new Date(cursor));
    }
  }
  if (occurrenceDates.length === 0) {
    throw new HttpError(400, "No occurrences fall within the given range and weekday pattern");
  }

  return prisma.$transaction(async (tx) => {
    const recurring = await tx.recurringBooking.create({
      data: {
        companyId: params.companyId,
        deskId: params.deskId,
        userId: params.userId,
        startDate: start,
        endDate: end,
        daysOfWeek: params.daysOfWeek,
        slot: params.slot,
      },
    });

    const created: BookingRecord[] = [];
    const skipped: string[] = [];

    for (const date of occurrenceDates) {
      const conflicting = await tx.booking.findFirst({
        where: {
          deskId: params.deskId,
          date,
          status: { not: "CANCELLED" },
          OR: [{ slot: "FULL_DAY" }, { slot: params.slot }],
        },
      });
      if (conflicting) {
        skipped.push(date.toISOString().slice(0, 10));
        continue;
      }
      const booking = await tx.booking.create({
        data: {
          companyId: params.companyId,
          deskId: params.deskId,
          userId: params.userId,
          date,
          slot: params.slot,
          status: "PENDING_CHECKIN",
          checkInBy: checkInDeadlineFor(date),
          recurringBookingId: recurring.id,
        },
        include: { desk: true, user: true },
      });
      created.push(toBookingRecord(booking));
    }

    return { recurringBookingId: recurring.id, created, skipped };
  });
}

export async function listMyBookings(companyId: string, userId: string) {
  const bookings = await prisma.booking.findMany({
    where: { companyId, userId, status: { not: "CANCELLED" } },
    include: { desk: true, user: true },
    orderBy: { date: "asc" },
  });
  return bookings.map(toBookingRecord);
}
