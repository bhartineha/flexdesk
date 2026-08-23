import { useQuery } from "@tanstack/react-query";
import type { BookingSlot, CapacitySnapshot } from "@flexdesk/shared";
import { apiClient } from "../api/client";

export function useCapacity(buildingId: string | undefined, date: string, slot: BookingSlot) {
  return useQuery({
    queryKey: ["capacity", buildingId, date, slot],
    queryFn: async () =>
      (
        await apiClient.get<CapacitySnapshot>(`/api/capacity/${buildingId}`, {
          params: { date, slot },
        })
      ).data,
    enabled: Boolean(buildingId),
    refetchInterval: 10_000,
  });
}
