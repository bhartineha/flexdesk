import { useQuery } from "@tanstack/react-query";
import type { BuildingSummary, FloorSummary } from "@flexdesk/shared";
import { apiClient } from "../api/client";

export function useBuildings() {
  return useQuery({
    queryKey: ["buildings"],
    queryFn: async () => (await apiClient.get<BuildingSummary[]>("/api/buildings")).data,
  });
}

export function useFloors(buildingId: string | undefined) {
  return useQuery({
    queryKey: ["floors", buildingId],
    queryFn: async () => (await apiClient.get<FloorSummary[]>(`/api/buildings/${buildingId}/floors`)).data,
    enabled: Boolean(buildingId),
  });
}
