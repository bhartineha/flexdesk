import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { getFloorLayout } from "../services/floorService";

export const floorsRouter = Router();
floorsRouter.use(requireAuth);

const layoutQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(["FULL_DAY", "MORNING", "AFTERNOON"]).default("FULL_DAY"),
});

floorsRouter.get(
  "/:floorId/layout",
  asyncHandler(async (req, res) => {
    const { date, slot } = layoutQuerySchema.parse(req.query);
    const layout = await getFloorLayout(req.auth!.companyId, req.params.floorId, date, slot);
    res.json(layout);
  })
);
