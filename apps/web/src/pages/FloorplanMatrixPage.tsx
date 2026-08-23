import { useEffect, useState } from "react";
import type { BookingSlot, DeskCell } from "@flexdesk/shared";
import { useAuth } from "../context/AuthContext";
import { useBuildings, useFloors } from "../hooks/useBuildings";
import { useBookDesk, useCancelBooking, useCheckIn, useFloorLayout } from "../hooks/useFloorLayout";
import { FloorplanCanvas } from "../components/floorplan/FloorplanCanvas";
import { LegendBar } from "../components/floorplan/LegendBar";
import { DateSlotPicker } from "../components/layout/DateSlotPicker";
import { RecurringBookingForm } from "../components/floorplan/RecurringBookingForm";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FloorplanMatrixPage() {
  const { user } = useAuth();
  const { data: buildings } = useBuildings();
  const [buildingId, setBuildingId] = useState<string>();
  const { data: floors } = useFloors(buildingId);
  const [floorId, setFloorId] = useState<string>();
  const [date, setDate] = useState(todayIso());
  const [slot, setSlot] = useState<BookingSlot>("FULL_DAY");
  const [showRecurring, setShowRecurring] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!buildingId && buildings?.length) setBuildingId(buildings[0].id);
  }, [buildings, buildingId]);

  useEffect(() => {
    setFloorId(undefined);
  }, [buildingId]);

  useEffect(() => {
    if (!floorId && floors?.length) setFloorId(floors[0].id);
  }, [floors, floorId]);

  const { data: layout, isLoading } = useFloorLayout(floorId, date, slot);
  const bookDesk = useBookDesk();
  const cancelBooking = useCancelBooking();
  const checkIn = useCheckIn();

  async function handleDeskClick(desk: DeskCell) {
    if (!floorId) return;
    setFeedback(null);
    try {
      if (desk.bookedBy?.id === user?.id) {
        if (desk.status === "PENDING_CHECKIN") {
          await checkIn.mutateAsync(desk.bookingId!);
          setFeedback(`Checked in at ${desk.label}.`);
          return;
        }
        if (window.confirm(`Release your booking at ${desk.label}?`)) {
          await cancelBooking.mutateAsync(desk.bookingId!);
          setFeedback(`Released ${desk.label}.`);
        }
        return;
      }
      await bookDesk.mutateAsync({ deskId: desk.id, date, slot });
      setFeedback(`Booked ${desk.label} for ${date}.`);
    } catch (err: any) {
      setFeedback(err?.response?.data?.error ?? "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Floorplan Matrix</h1>
          <p className="text-sm text-slate-500">Click an available desk, pod, or monitor to book it instantly.</p>
        </div>
        <DateSlotPicker date={date} slot={slot} onDateChange={setDate} onSlotChange={setSlot} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={buildingId ?? ""}
          onChange={(e) => setBuildingId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          {buildings?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={floorId ?? ""}
          onChange={(e) => setFloorId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          {floors?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowRecurring((v) => !v)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:ml-auto"
        >
          {showRecurring ? "Hide recurring booking" : "Book a recurring lease"}
        </button>
      </div>

      {showRecurring && floorId && layout && (
        <RecurringBookingForm desks={layout.desks} onBooked={() => setShowRecurring(false)} />
      )}

      {feedback && (
        <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{feedback}</div>
      )}

      <LegendBar />

      {isLoading && <p className="text-sm text-slate-500">Loading floorplan…</p>}
      {layout && (
        <FloorplanCanvas
          floor={layout.floor}
          desks={layout.desks}
          currentUserId={user!.id}
          onDeskClick={handleDeskClick}
        />
      )}
    </div>
  );
}
