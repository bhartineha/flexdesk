import cron from "node-cron";
import { prisma } from "../db/client";
import { env } from "../config/env";

// Frees any desk still PENDING_CHECKIN once its check-in deadline has
// passed, so a no-show doesn't hold a hot desk for the rest of the day.
// Runs as a single UPDATE ... WHERE query rather than a
// fetch-then-update-per-row loop, so it stays cheap regardless of how many
// bookings are outstanding.
export async function runAutoRelease(): Promise<number> {
  const now = new Date();
  const result = await prisma.booking.updateMany({
    where: {
      status: "PENDING_CHECKIN",
      checkInBy: { lt: now },
    },
    data: { status: "RELEASED" },
  });
  if (result.count > 0) {
    // eslint-disable-next-line no-console
    console.log(`[auto-release] released ${result.count} unconfirmed booking(s) at ${now.toISOString()}`);
  }
  return result.count;
}

export function startAutoReleaseRunner() {
  cron.schedule(env.releaseRunnerCron, () => {
    runAutoRelease().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[auto-release] run failed", err);
    });
  });
  // eslint-disable-next-line no-console
  console.log(`[auto-release] scheduled with cron "${env.releaseRunnerCron}"`);
}
