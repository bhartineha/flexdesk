import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requestTeamSync } from "../services/teamSyncService";
import type { TeamSummary } from "@flexdesk/shared";

export const teamsRouter = Router();
teamsRouter.use(requireAuth);

teamsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const teams = await prisma.team.findMany({
      where: { companyId: req.auth!.companyId },
      include: { memberships: { include: { user: true } } },
      orderBy: { name: "asc" },
    });
    const summaries: TeamSummary[] = teams.map((t) => ({
      id: t.id,
      name: t.name,
      memberCount: t.memberships.length,
      members: t.memberships.map((m) => ({ id: m.user.id, name: m.user.name, isLead: m.isLead })),
    }));
    res.json(summaries);
  })
);

const syncSchema = z.object({
  teamId: z.string().uuid(),
  floorId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(["FULL_DAY", "MORNING", "AFTERNOON"]).default("FULL_DAY"),
  deskIds: z.array(z.string().uuid()).optional(),
});

teamsRouter.post(
  "/sync",
  requireRole("ADMIN", "TEAM_LEAD"),
  asyncHandler(async (req, res) => {
    const input = syncSchema.parse(req.body);
    const result = await requestTeamSync({
      companyId: req.auth!.companyId,
      createdById: req.auth!.id,
      ...input,
    });
    res.status(201).json(result);
  })
);
