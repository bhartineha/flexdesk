import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../utils/asyncHandler";
import type { Role } from "@flexdesk/shared";

export interface AuthContext {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function signToken(payload: AuthContext): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing bearer token");
  }
  const token = header.slice("Bearer ".length);
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthContext;
    req.auth = decoded;
    next();
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

// Every query downstream of this middleware must filter by req.auth.companyId.
// This is the single tenant boundary in the app: the JWT payload's companyId
// is set once at login from the authenticated user's row and never taken
// from client-supplied input, so a request cannot widen its own tenant scope.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new HttpError(403, "Insufficient permissions");
    }
    next();
  };
}
