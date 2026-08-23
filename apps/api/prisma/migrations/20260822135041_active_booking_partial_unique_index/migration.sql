-- DropIndex
DROP INDEX "Booking_deskId_date_slot_key";

-- CreateIndex
CREATE INDEX "Booking_deskId_date_slot_idx" ON "Booking"("deskId", "date", "slot");

-- A plain unique index on (deskId, date, slot) would cover every row
-- regardless of status, so once a booking on a slot was ever cancelled,
-- that slot could never be booked again. This partial index is the actual
-- double-booking guard: it only applies to bookings that still hold the
-- slot (PENDING_CHECKIN or CHECKED_IN), so a cancelled or auto-released
-- booking frees the slot for real.
CREATE UNIQUE INDEX "Booking_active_desk_date_slot_key"
  ON "Booking" ("deskId", "date", "slot")
  WHERE "status" IN ('PENDING_CHECKIN', 'CHECKED_IN');
