import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { buildingsRouter } from "./routes/buildings.routes";
import { floorsRouter } from "./routes/floors.routes";
import { bookingsRouter } from "./routes/bookings.routes";
import { teamsRouter } from "./routes/teams.routes";
import { capacityRouter } from "./routes/capacity.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/buildings", buildingsRouter);
  app.use("/api/floors", floorsRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/teams", teamsRouter);
  app.use("/api/capacity", capacityRouter);

  app.use(errorHandler);

  return app;
}
