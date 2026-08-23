import type { DeskCell } from "@flexdesk/shared";

interface Props {
  desk: DeskCell;
  currentUserId: string;
  onClick: (desk: DeskCell) => void;
}

const TYPE_ICON: Record<DeskCell["type"], string> = {
  DESK: "🖥️",
  MEETING_POD: "🛋️",
  MONITOR_STATION: "🖵",
};

function statusClasses(desk: DeskCell, isMine: boolean): string {
  if (isMine) return "bg-brand-600 border-brand-700 text-white";
  switch (desk.status) {
    case "AVAILABLE":
      return "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer";
    case "PENDING_CHECKIN":
      return "bg-amber-50 border-amber-300 text-amber-800";
    case "CHECKED_IN":
      return "bg-rose-50 border-rose-300 text-rose-800";
    case "RELEASED":
      return "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer";
    default:
      return "bg-slate-100 border-slate-300 text-slate-600";
  }
}

export function DeskTile({ desk, currentUserId, onClick }: Props) {
  const isMine = desk.bookedBy?.id === currentUserId;
  const isBookable = desk.status === "AVAILABLE" || desk.status === "RELEASED" || isMine;

  return (
    <button
      type="button"
      data-cy="desk-tile"
      data-status={desk.status}
      data-mine={isMine}
      title={`${desk.label}${desk.bookedBy ? ` — booked by ${desk.bookedBy.name}` : ""}`}
      disabled={!isBookable}
      onClick={() => onClick(desk)}
      style={{
        gridColumn: `${desk.gridX + 1} / span ${desk.gridW}`,
        gridRow: `${desk.gridY + 1} / span ${desk.gridH}`,
      }}
      className={`flex flex-col items-center justify-center rounded-md border p-1 text-[10px] leading-tight transition-colors sm:text-xs ${statusClasses(
        desk,
        isMine
      )} ${!isBookable && !isMine ? "cursor-not-allowed opacity-90" : ""}`}
    >
      <span aria-hidden className="text-sm sm:text-base">
        {TYPE_ICON[desk.type]}
      </span>
      <span className="truncate font-semibold">{desk.label}</span>
    </button>
  );
}
