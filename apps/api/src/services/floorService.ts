import { prisma } from "../db/client";
import { HttpError } from "../utils/asyncHandler";
import type { BookingSlot, BookingStatus, DeskCell, FloorLayoutResponse } from "@flexdesk/shared";

export async function getFloorLayout(
  companyId: string,
  floorId: string,
  date: string,
  slot: BookingSlot
): Promise<FloorLayoutResponse> {
  const floor = await prisma.floor.findFirst({
    where: { id: floorId, building: { companyId } },
  });
  if (!floor) throw new HttpError(404, "Floor not found");

  const desks = await prisma.desk.findMany({
    where: { floorId },
    orderBy: [{ gridY: "asc" }, { gridX: "asc" }],
  });

  const dateObj = new Date(`${date}T00:00:00.000Z`);
  const bookings = await prisma.booking.findMany({
    where: {
      date: dateObj,
      status: { not: "CANCELLED" },
      desk: { floorId },
      OR: [{ slot: "FULL_DAY" }, { slot }],
    },
    include: { user: true },
  });
  const bookingByDesk = new Map(bookings.map((b) => [b.deskId, b]));

  const deskCells: DeskCell[] = desks.map((desk) => {
    const booking = bookingByDesk.get(desk.id);
    const status: BookingStatus = booking ? (booking.status as BookingStatus) : "AVAILABLE";
    return {
      id: desk.id,
      floorId: desk.floorId,
      label: desk.label,
      type: desk.type,
      gridX: desk.gridX,
      gridY: desk.gridY,
      gridW: desk.gridW,
      gridH: desk.gridH,
      status,
      bookingId: booking?.id ?? null,
      bookedBy: booking ? { id: booking.user.id, name: booking.user.name } : null,
    };
  });

  return {
    floor: {
      id: floor.id,
      buildingId: floor.buildingId,
      name: floor.name,
      sortOrder: floor.sortOrder,
      gridWidth: floor.gridWidth,
      gridHeight: floor.gridHeight,
    },
    desks: deskCells,
    date,
    slot,
  };
}
