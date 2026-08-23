import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BookingSlot, TeamSummary, TeamSyncResult } from "@flexdesk/shared";
import { apiClient } from "../api/client";

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await apiClient.get<TeamSummary[]>("/api/teams")).data,
  });
}

export function useRequestTeamSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      teamId: string;
      floorId: string;
      date: string;
      slot: BookingSlot;
      deskIds?: string[];
    }) => (await apiClient.post<TeamSyncResult>("/api/teams/sync", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floor-layout"] });
      queryClient.invalidateQueries({ queryKey: ["capacity"] });
    },
  });
}
