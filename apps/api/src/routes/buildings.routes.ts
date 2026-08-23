import { Router } from "express";
import { prisma } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import type { BuildingSummary, FloorSummary } from "@flexdesk/shared";

export const buildingsRouter = Router();
buildingsRouter.use(requireAuth);

buildingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const buildings = await prisma.building.findMany({
      where: { companyId: req.auth!.companyId },
      orderBy: { name: "asc" },
    });
    const summaries: BuildingSummary[] = buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      timezone: b.timezone,
      capacityLimit: b.capacityLimit,
    }));
    res.json(summaries);
  })
);

buildingsRouter.get(
  "/:buildingId/floors",
  asyncHandler(async (req, res) => {
    const floors = await prisma.floor.findMany({
      where: { buildingId: req.params.buildingId, building: { companyId: req.auth!.companyId } },
      orderBy: { sortOrder: "asc" },
    });
    const summaries: FloorSummary[] = floors.map((f) => ({
      id: f.id,
      buildingId: f.buildingId,
      name: f.name,
      sortOrder: f.sortOrder,
      gridWidth: f.gridWidth,
      gridHeight: f.gridHeight,
    }));
    res.json(summaries);
  })
);
