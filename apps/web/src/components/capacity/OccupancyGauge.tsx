import type { CapacitySnapshot } from "@flexdesk/shared";

const STATUS_STYLES: Record<CapacitySnapshot["status"], { bar: string; text: string; label: string }> = {
  LOW: { bar: "bg-emerald-500", text: "text-emerald-700", label: "Low occupancy" },
  MODERATE: { bar: "bg-amber-500", text: "text-amber-700", label: "Moderate occupancy" },
  HIGH: { bar: "bg-orange-500", text: "text-orange-700", label: "High occupancy" },
  AT_CEILING: { bar: "bg-rose-600", text: "text-rose-700", label: "At safety ceiling" },
};

export function OccupancyGauge({ snapshot }: { snapshot: CapacitySnapshot }) {
  const style = STATUS_STYLES[snapshot.status];
  const pct = Math.min(snapshot.utilizationPct, 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{snapshot.buildingName}</h3>
        <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
      </div>

      <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${style.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>
          <strong className="text-slate-900">{snapshot.bookedCount}</strong> / {snapshot.capacityLimit} booked
        </span>
        <span>
          <strong className="text-slate-900">{snapshot.checkedInCount}</strong> checked in
        </span>
        <span className="font-semibold text-slate-900">{snapshot.utilizationPct}%</span>
      </div>
    </div>
  );
}
