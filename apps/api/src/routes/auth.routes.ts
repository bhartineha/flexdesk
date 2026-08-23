import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db/client";
import { signToken } from "../middleware/auth";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import type { LoginResponse } from "@flexdesk/shared";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, "Invalid email or password");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new HttpError(401, "Invalid email or password");

    const payload = {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = signToken(payload);

    const response: LoginResponse = { token, user: payload };
    res.json(response);
  })
);

authRouter.get(
  "/demo-accounts",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { email: true, name: true, role: true, company: { select: { name: true } } },
      orderBy: { email: "asc" },
    });
    res.json({
      note: "Seeded demo accounts — password for all of them is 'password123'.",
      users,
    });
  })
);
