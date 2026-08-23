import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BookingSlot, FloorLayoutResponse } from "@flexdesk/shared";
import { apiClient } from "../api/client";

export function useFloorLayout(floorId: string | undefined, date: string, slot: BookingSlot) {
  return useQuery({
    queryKey: ["floor-layout", floorId, date, slot],
    queryFn: async () =>
      (
        await apiClient.get<FloorLayoutResponse>(`/api/floors/${floorId}/layout`, {
          params: { date, slot },
        })
      ).data,
    enabled: Boolean(floorId),
    refetchInterval: 15_000,
  });
}

export function useBookDesk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { deskId: string; date: string; slot: BookingSlot }) =>
      (await apiClient.post("/api/bookings", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floor-layout"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => apiClient.delete(`/api/bookings/${bookingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floor-layout"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => (await apiClient.post(`/api/bookings/${bookingId}/checkin`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floor-layout"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });
}
