import type { CapacitySnapshot } from "@flexdesk/shared";

function barColor(pct: number): string {
  if (pct >= 100) return "bg-rose-600";
  if (pct >= 85) return "bg-orange-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-emerald-500";
}

export function FloorBreakdownChart({ byFloor }: { byFloor: CapacitySnapshot["byFloor"] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <h3 className="mb-4 text-base font-semibold text-slate-900 sm:text-lg">Occupancy by floor</h3>
      <div className="flex flex-col gap-3">
        {byFloor.map((floor) => {
          const pct = floor.deskCount ? Math.round((floor.bookedCount / floor.deskCount) * 100) : 0;
          return (
            <div key={floor.floorId}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-700">{floor.floorName}</span>
                <span className="text-slate-500">
                  {floor.bookedCount}/{floor.deskCount} desks
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${barColor(pct)}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
