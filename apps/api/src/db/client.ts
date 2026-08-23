import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __flexdeskPrisma: PrismaClient | undefined;
}

export const prisma = global.__flexdeskPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__flexdeskPrisma = prisma;
}
