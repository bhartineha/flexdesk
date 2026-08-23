import type { BookingSlot } from "@flexdesk/shared";

interface Props {
  date: string;
  slot: BookingSlot;
  onDateChange: (date: string) => void;
  onSlotChange: (slot: BookingSlot) => void;
}

const SLOTS: { value: BookingSlot; label: string }[] = [
  { value: "FULL_DAY", label: "Full day" },
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
];

export function DateSlotPicker({ date, slot, onDateChange, onSlotChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className="min-w-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      />
      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-300 p-1">
        {SLOTS.map((s) => (
          <button
            key={s.value}
            onClick={() => onSlotChange(s.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium sm:text-sm ${
              slot === s.value ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
