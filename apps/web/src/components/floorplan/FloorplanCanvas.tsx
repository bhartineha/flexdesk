import type { DeskCell, FloorSummary } from "@flexdesk/shared";
import { DeskTile } from "./DeskTile";

interface Props {
  floor: FloorSummary;
  desks: DeskCell[];
  currentUserId: string;
  onDeskClick: (desk: DeskCell) => void;
}

export function FloorplanCanvas({ floor, desks, currentUserId, onDeskClick }: Props) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${floor.gridWidth}, minmax(2.25rem, 1fr))`,
          gridTemplateRows: `repeat(${floor.gridHeight}, minmax(2.25rem, 1fr))`,
          minWidth: `${floor.gridWidth * 2.5}rem`,
        }}
      >
        {desks.map((desk) => (
          <DeskTile key={desk.id} desk={desk} currentUserId={currentUserId} onClick={onDeskClick} />
        ))}
      </div>
    </div>
  );
}
