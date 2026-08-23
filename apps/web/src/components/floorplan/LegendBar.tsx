const LEGEND: { label: string; className: string }[] = [
  { label: "Available", className: "bg-emerald-50 border-emerald-300" },
  { label: "Pending check-in", className: "bg-amber-50 border-amber-300" },
  { label: "Checked in", className: "bg-rose-50 border-rose-300" },
  { label: "Your booking", className: "bg-brand-600 border-brand-700" },
];

export function LegendBar() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-600 sm:text-sm">
      {LEGEND.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`h-3.5 w-3.5 rounded border ${item.className}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
