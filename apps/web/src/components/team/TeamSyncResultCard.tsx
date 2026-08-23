import type { TeamSyncResult } from "@flexdesk/shared";

export function TeamSyncResultCard({ result }: { result: TeamSyncResult }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Cluster reserved</h3>
      <p className="mt-1 text-sm text-slate-600">
        {result.bookings.length} desk{result.bookings.length === 1 ? "" : "s"} booked for {result.event.date}.
      </p>

      <ul className="mt-3 divide-y divide-slate-100">
        {result.bookings.map((b) => (
          <li key={b.id} className="flex items-center justify-between py-2 text-sm">
            <span className="font-medium text-slate-800">{b.userName}</span>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              {b.deskLabel}
            </span>
          </li>
        ))}
      </ul>

      {result.unassignedMembers.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Not enough free desks for the whole team.</p>
          <p className="mt-1">
            Unseated: {result.unassignedMembers.map((m) => m.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
