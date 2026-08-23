import { prisma } from "../db/client";
import { HttpError } from "../utils/asyncHandler";
import type { BookingSlot, CapacitySnapshot } from "@flexdesk/shared";

function statusFor(pct: number): CapacitySnapshot["status"] {
  if (pct >= 100) return "AT_CEILING";
  if (pct >= 85) return "HIGH";
  if (pct >= 50) return "MODERATE";
  return "LOW";
}

export async function getCapacitySnapshot(
  companyId: string,
  buildingId: string,
  date: string,
  slot: BookingSlot
): Promise<CapacitySnapshot> {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, companyId },
    include: { floors: { include: { desks: true } } },
  });
  if (!building) throw new HttpError(404, "Building not found");

  const dateObj = new Date(`${date}T00:00:00.000Z`);
  const bookings = await prisma.booking.findMany({
    where: {
      date: dateObj,
      status: { not: "CANCELLED" },
      desk: { floor: { buildingId } },
      OR: [{ slot: "FULL_DAY" }, { slot }],
    },
    select: { deskId: true, status: true, desk: { select: { floorId: true } } },
  });

  const bookedCount = bookings.length;
  const checkedInCount = bookings.filter((b) => b.status === "CHECKED_IN").length;
  const utilizationPct = building.capacityLimit
    ? Math.round((bookedCount / building.capacityLimit) * 100)
    : 0;

  const bookedByFloor = new Map<string, number>();
  for (const b of bookings) {
    bookedByFloor.set(b.desk.floorId, (bookedByFloor.get(b.desk.floorId) ?? 0) + 1);
  }

  return {
    buildingId: building.id,
    buildingName: building.name,
    capacityLimit: building.capacityLimit,
    bookedCount,
    checkedInCount,
    utilizationPct,
    status: statusFor(utilizationPct),
    byFloor: building.floors.map((floor) => ({
      floorId: floor.id,
      floorName: floor.name,
      deskCount: floor.desks.length,
      bookedCount: bookedByFloor.get(floor.id) ?? 0,
    })),
  };
}
