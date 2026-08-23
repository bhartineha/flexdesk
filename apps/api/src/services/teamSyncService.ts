import { prisma } from "../db/client";
import { HttpError } from "../utils/asyncHandler";
import { env } from "../config/env";
import type { BookingRecord, BookingSlot, TeamSyncResult } from "@flexdesk/shared";

function checkInDeadlineFor(date: Date): Date {
  const deadline = new Date(date);
  deadline.setUTCHours(9, 0, 0, 0);
  deadline.setUTCMinutes(deadline.getUTCMinutes() + env.checkinGraceMinutes);
  return deadline;
}

// Distance from the cluster's centroid, so auto-assignment fills the
// tightest physical group of desks rather than the first free ones by id.
function clusterDistance(a: { gridX: number; gridY: number }, b: { gridX: number; gridY: number }) {
  return Math.hypot(a.gridX - b.gridX, a.gridY - b.gridY);
}

export async function requestTeamSync(params: {
  companyId: string;
  createdById: string;
  teamId: string;
  floorId: string;
  date: string;
  slot: BookingSlot;
  deskIds?: string[];
}): Promise<TeamSyncResult> {
  const team = await prisma.team.findFirst({
    where: { id: params.teamId, companyId: params.companyId },
    include: { memberships: { include: { user: true } } },
  });
  if (!team) throw new HttpError(404, "Team not found");
  if (team.memberships.length === 0) throw new HttpError(400, "Team has no members to seat");

  const floor = await prisma.floor.findFirst({
    where: { id: params.floorId, building: { companyId: params.companyId } },
  });
  if (!floor) throw new HttpError(404, "Floor not found");

  const dateObj = new Date(`${params.date}T00:00:00.000Z`);
  const allDesks = await prisma.desk.findMany({
    where: { floorId: params.floorId, type: "DESK" },
  });

  const takenDeskIds = new Set(
    (
      await prisma.booking.findMany({
        where: {
          date: dateObj,
          status: { not: "CANCELLED" },
          desk: { floorId: params.floorId },
          OR: [{ slot: "FULL_DAY" }, { slot: params.slot }],
        },
        select: { deskId: true },
      })
    ).map((b) => b.deskId)
  );

  let candidateDesks = allDesks.filter((d) => !takenDeskIds.has(d.id));

  if (params.deskIds && params.deskIds.length > 0) {
    const requested = new Set(params.deskIds);
    candidateDesks = candidateDesks.filter((d) => requested.has(d.id));
  } else {
    const centroid = allDesks.reduce(
      (acc, d) => ({ gridX: acc.gridX + d.gridX, gridY: acc.gridY + d.gridY }),
      { gridX: 0, gridY: 0 }
    );
    centroid.gridX /= allDesks.length || 1;
    centroid.gridY /= allDesks.length || 1;
    candidateDesks = candidateDesks.sort(
      (a, b) => clusterDistance(a, centroid) - clusterDistance(b, centroid)
    );
  }

  const members = team.memberships.map((m) => m.user);
  const seatCount = Math.min(candidateDesks.length, members.length);
  const seatedMembers = members.slice(0, seatCount);
  const unassignedMembers = members.slice(seatCount).map((m) => ({ id: m.id, name: m.name }));
  const desksToBook = candidateDesks.slice(0, seatCount);

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.teamSyncEvent.create({
      data: {
        companyId: params.companyId,
        teamId: params.teamId,
        date: dateObj,
        slot: params.slot,
        createdById: params.createdById,
      },
    });

    const bookings: BookingRecord[] = [];
    for (let i = 0; i < seatedMembers.length; i++) {
      const desk = desksToBook[i];
      const member = seatedMembers[i];
      const booking = await tx.booking.create({
        data: {
          companyId: params.companyId,
          deskId: desk.id,
          userId: member.id,
          date: dateObj,
          slot: params.slot,
          status: "PENDING_CHECKIN",
          checkInBy: checkInDeadlineFor(dateObj),
          teamSyncEventId: event.id,
        },
        include: { desk: true, user: true },
      });
      bookings.push({
        id: booking.id,
        deskId: booking.deskId,
        deskLabel: desk.label,
        userId: booking.userId,
        userName: member.name,
        date: params.date,
        slot: params.slot,
        status: booking.status as BookingRecord["status"],
        checkInBy: booking.checkInBy.toISOString(),
        checkedInAt: null,
      });
    }

    return { event, bookings };
  });

  return {
    event: {
      id: result.event.id,
      teamId: params.teamId,
      date: params.date,
      slot: params.slot,
    },
    bookings: result.bookings,
    unassignedMembers,
  };
}
