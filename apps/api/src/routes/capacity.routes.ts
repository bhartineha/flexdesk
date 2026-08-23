import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { getCapacitySnapshot } from "../services/capacityService";

export const capacityRouter = Router();
capacityRouter.use(requireAuth);

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(["FULL_DAY", "MORNING", "AFTERNOON"]).default("FULL_DAY"),
});

capacityRouter.get(
  "/:buildingId",
  asyncHandler(async (req, res) => {
    const { date, slot } = querySchema.parse(req.query);
    const snapshot = await getCapacitySnapshot(req.auth!.companyId, req.params.buildingId, date, slot);
    res.json(snapshot);
  })
);
