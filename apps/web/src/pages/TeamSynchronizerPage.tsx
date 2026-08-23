import { useEffect, useState } from "react";
import type { BookingSlot, TeamSyncResult } from "@flexdesk/shared";
import { useBuildings, useFloors } from "../hooks/useBuildings";
import { useTeams, useRequestTeamSync } from "../hooks/useTeams";
import { DateSlotPicker } from "../components/layout/DateSlotPicker";
import { TeamSyncResultCard } from "../components/team/TeamSyncResultCard";
import { useAuth } from "../context/AuthContext";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TeamSynchronizerPage() {
  const { user } = useAuth();
  const canRequestSync = user?.role === "ADMIN" || user?.role === "TEAM_LEAD";

  const { data: teams } = useTeams();
  const { data: buildings } = useBuildings();
  const [buildingId, setBuildingId] = useState<string>();
  const { data: floors } = useFloors(buildingId);
  const [floorId, setFloorId] = useState<string>();
  const [teamId, setTeamId] = useState<string>();
  const [date, setDate] = useState(todayIso());
  const [slot, setSlot] = useState<BookingSlot>("FULL_DAY");
  const [result, setResult] = useState<TeamSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestSync = useRequestTeamSync();

  useEffect(() => {
    if (!buildingId && buildings?.length) setBuildingId(buildings[0].id);
  }, [buildings, buildingId]);

  useEffect(() => setFloorId(undefined), [buildingId]);

  useEffect(() => {
    if (!floorId && floors?.length) setFloorId(floors[0].id);
  }, [floors, floorId]);

  useEffect(() => {
    if (!teamId && teams?.length) setTeamId(teams[0].id);
  }, [teams, teamId]);

  const selectedTeam = teams?.find((t) => t.id === teamId);

  async function handleSubmit() {
    if (!teamId || !floorId) return;
    setError(null);
    setResult(null);
    try {
      const data = await requestSync.mutateAsync({ teamId, floorId, date, slot });
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to reserve cluster.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Team Synchronizer</h1>
        <p className="text-sm text-slate-500">
          Reserve a matching cluster of desks for a whole team's collaboration day.
        </p>
      </div>

      {!canRequestSync && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Only team leads and admins can request a team sync. Signed in as {user?.role.toLowerCase()}.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-slate-700">
          Team
          <select
            value={teamId ?? ""}
            onChange={(e) => setTeamId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            {teams?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.memberCount})
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Building
          <select
            value={buildingId ?? ""}
            onChange={(e) => setBuildingId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            {buildings?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Floor
          <select
            value={floorId ?? ""}
            onChange={(e) => setFloorId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            {floors?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <div className="text-sm font-medium text-slate-700">
          Date &amp; slot
          <div className="mt-1">
            <DateSlotPicker date={date} slot={slot} onDateChange={setDate} onSlotChange={setSlot} />
          </div>
        </div>
      </div>

      {selectedTeam && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">{selectedTeam.name} — members</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedTeam.members.map((m) => (
              <span
                key={m.id}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {m.name}
                {m.isLead ? " (lead)" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canRequestSync || requestSync.isPending || !teamId || !floorId}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {requestSync.isPending ? "Reserving cluster…" : "Reserve matching cluster"}
      </button>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {result && <TeamSyncResultCard result={result} />}
    </div>
  );
}
