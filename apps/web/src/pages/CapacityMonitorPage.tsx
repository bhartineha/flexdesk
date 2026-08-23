import { useEffect, useState } from "react";
import type { BookingSlot } from "@flexdesk/shared";
import { useBuildings } from "../hooks/useBuildings";
import { useCapacity } from "../hooks/useCapacity";
import { DateSlotPicker } from "../components/layout/DateSlotPicker";
import { OccupancyGauge } from "../components/capacity/OccupancyGauge";
import { FloorBreakdownChart } from "../components/capacity/FloorBreakdownChart";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CapacityMonitorPage() {
  const { data: buildings } = useBuildings();
  const [buildingId, setBuildingId] = useState<string>();
  const [date, setDate] = useState(todayIso());
  const [slot, setSlot] = useState<BookingSlot>("FULL_DAY");

  useEffect(() => {
    if (!buildingId && buildings?.length) setBuildingId(buildings[0].id);
  }, [buildings, buildingId]);

  const { data: snapshot, isLoading } = useCapacity(buildingId, date, slot);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Capacity Monitor</h1>
          <p className="text-sm text-slate-500">Live occupancy against each building's safety ceiling.</p>
        </div>
        <DateSlotPicker date={date} slot={slot} onDateChange={setDate} onSlotChange={setSlot} />
      </div>

      <select
        value={buildingId ?? ""}
        onChange={(e) => setBuildingId(e.target.value)}
        className="self-start rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        {buildings?.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      {isLoading && <p className="text-sm text-slate-500">Loading capacity data…</p>}

      {snapshot && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <OccupancyGauge snapshot={snapshot} />
          <FloorBreakdownChart byFloor={snapshot.byFloor} />
        </div>
      )}

      <p className="text-xs text-slate-400">Auto-refreshes every 10 seconds.</p>
    </div>
  );
}
