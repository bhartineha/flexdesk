export type Role = "ADMIN" | "TEAM_LEAD" | "EMPLOYEE";

export type DeskType = "DESK" | "MEETING_POD" | "MONITOR_STATION";

export type BookingSlot = "FULL_DAY" | "MORNING" | "AFTERNOON";

export type BookingStatus =
  | "PENDING_CHECKIN"
  | "CHECKED_IN"
  | "RELEASED"
  | "CANCELLED"
  | "AVAILABLE";

export interface AuthUser {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface BuildingSummary {
  id: string;
  name: string;
  address: string;
  timezone: string;
  capacityLimit: number;
}

export interface FloorSummary {
  id: string;
  buildingId: string;
  name: string;
  sortOrder: number;
  gridWidth: number;
  gridHeight: number;
}

export interface DeskCell {
  id: string;
  floorId: string;
  label: string;
  type: DeskType;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  status: BookingStatus;
  bookingId: string | null;
  bookedBy: { id: string; name: string } | null;
}

export interface FloorLayoutResponse {
  floor: FloorSummary;
  desks: DeskCell[];
  date: string;
  slot: BookingSlot;
}

export interface BookingRecord {
  id: string;
  deskId: string;
  deskLabel: string;
  userId: string;
  userName: string;
  date: string;
  slot: BookingSlot;
  status: BookingStatus;
  checkInBy: string;
  checkedInAt: string | null;
}

export interface CreateRecurringBookingInput {
  deskId: string;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  slot: BookingSlot;
}

export interface TeamSummary {
  id: string;
  name: string;
  memberCount: number;
  members: { id: string; name: string; isLead: boolean }[];
}

export interface TeamSyncRequestInput {
  teamId: string;
  floorId: string;
  date: string;
  slot: BookingSlot;
  deskIds?: string[];
}

export interface TeamSyncResult {
  event: {
    id: string;
    teamId: string;
    date: string;
    slot: BookingSlot;
  };
  bookings: BookingRecord[];
  unassignedMembers: { id: string; name: string }[];
}

export interface CapacitySnapshot {
  buildingId: string;
  buildingName: string;
  capacityLimit: number;
  bookedCount: number;
  checkedInCount: number;
  utilizationPct: number;
  status: "LOW" | "MODERATE" | "HIGH" | "AT_CEILING";
  byFloor: {
    floorId: string;
    floorName: string;
    deskCount: number;
    bookedCount: number;
  }[];
}
