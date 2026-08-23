import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeskCell } from "@flexdesk/shared";
import { apiClient } from "../../api/client";

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
];

interface Props {
  desks: DeskCell[];
  onBooked: () => void;
}

export function RecurringBookingForm({ desks, onBooked }: Props) {
  const queryClient = useQueryClient();
  const bookableDesks = desks.filter((d) => d.type === "DESK");
  const [deskId, setDeskId] = useState(bookableDesks[0]?.id ?? "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 28 * 86_400_000).toISOString().slice(0, 10)
  );
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post("/api/bookings/recurring", {
          deskId,
          startDate,
          endDate,
          daysOfWeek: days,
          slot: "FULL_DAY",
        })
      ).data,
    onSuccess: (data) => {
      setResult({ created: data.created.length, skipped: data.skipped.length });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["floor-layout"] });
      onBooked();
    },
    onError: (err: any) => setError(err?.response?.data?.error ?? "Failed to create recurring booking"),
  });

  function toggleDay(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="text-sm font-medium text-slate-700">
        Desk
        <select
          value={deskId}
          onChange={(e) => setDeskId(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          {bookableDesks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-slate-700">
        From
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
      </label>

      <label className="text-sm font-medium text-slate-700">
        Until
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
      </label>

      <div className="text-sm font-medium text-slate-700">
        Days
        <div className="mt-1 flex gap-1">
          {WEEKDAYS.map((d) => (
            <button
              type="button"
              key={d.value}
              onClick={() => toggleDay(d.value)}
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                days.includes(d.value) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || !deskId || days.length === 0}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {mutation.isPending ? "Compiling…" : "Create recurring lease"}
      </button>

      {result && (
        <p className="w-full text-sm text-emerald-700">
          Compiled {result.created} booking{result.created === 1 ? "" : "s"}
          {result.skipped > 0 ? ` (${result.skipped} day(s) skipped — desk already taken)` : ""}.
        </p>
      )}
      {error && <p className="w-full text-sm text-rose-600">{error}</p>}
    </form>
  );
}
