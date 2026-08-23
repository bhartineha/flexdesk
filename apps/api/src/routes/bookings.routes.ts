import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
  bookDeskInstant,
  cancelBooking,
  checkIn,
  compileRecurringBooking,
  listMyBookings,
} from "../services/bookingService";

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

const slotEnum = z.enum(["FULL_DAY", "MORNING", "AFTERNOON"]);

const instantBookingSchema = z.object({
  deskId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: slotEnum.default("FULL_DAY"),
});

bookingsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = instantBookingSchema.parse(req.body);
    const booking = await bookDeskInstant({
      companyId: req.auth!.companyId,
      userId: req.auth!.id,
      ...input,
    });
    res.status(201).json(booking);
  })
);

bookingsRouter.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const bookings = await listMyBookings(req.auth!.companyId, req.auth!.id);
    res.json(bookings);
  })
);

bookingsRouter.post(
  "/:bookingId/checkin",
  asyncHandler(async (req, res) => {
    const booking = await checkIn(req.auth!.companyId, req.auth!.id, req.params.bookingId);
    res.json(booking);
  })
);

bookingsRouter.delete(
  "/:bookingId",
  asyncHandler(async (req, res) => {
    await cancelBooking(req.auth!.companyId, req.auth!.id, req.params.bookingId);
    res.status(204).send();
  })
);

const recurringSchema = z.object({
  deskId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  slot: slotEnum.default("FULL_DAY"),
});

bookingsRouter.post(
  "/recurring",
  asyncHandler(async (req, res) => {
    const input = recurringSchema.parse(req.body);
    const result = await compileRecurringBooking({
      companyId: req.auth!.companyId,
      userId: req.auth!.id,
      ...input,
    });
    res.status(201).json(result);
  })
);
