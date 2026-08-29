import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api/client';
import { z } from 'zod';
import type { JourneyRecord } from '@/pages/Profile/data/profileData';

const JourneyRecordDTOSchema = z.object({
  trip_id: z.string(),
  selected_mode: z.string(),
  distance_km: z.number(),
  carbon_g: z.number(),
  cost_inr: z.number(),
  carbon_saved_vs_car_g: z.number(),
  cost_saved_vs_car_inr: z.number(),
  cooperation_used: z.boolean(),
  created_at: z.string(),
  origin_name: z.string().nullable().optional(),
  destination_name: z.string().nullable().optional(),
  duration_min: z.number().nullable().optional(),
});

const HistoryResponseSchema = z.array(JourneyRecordDTOSchema);

export function useUserHistoryQuery() {
  return useQuery<JourneyRecord[]>({
    queryKey: ['userHistory'],
    queryFn: async () => {
      const data = await apiRequest({
        method: 'GET',
        path: '/users/me/history',
        schema: HistoryResponseSchema,
      });

      return data.map(dto => ({
        id: dto.trip_id,
        origin: dto.origin_name || 'Unknown Origin',
        destination: dto.destination_name || 'Unknown Destination',
        distanceKm: dto.distance_km,
        mode: {
          name: dto.selected_mode === 'car' ? 'Car' : dto.selected_mode === 'two_wheeler' ? 'Electric Two-Wheeler' : 'Bicycle',
          icon: dto.selected_mode === 'car' ? '🚗' : dto.selected_mode === 'two_wheeler' ? '⚡' : '🚲',
        },
        timestamp: new Date(dto.created_at).toLocaleString(),
        durationMin: dto.duration_min || 0,
        costInr: dto.cost_inr,
        carbonG: dto.carbon_g,
        avoidedCarbonG: dto.carbon_saved_vs_car_g,
        avoidedText: `-${Math.round(dto.carbon_saved_vs_car_g)}g avoided`,
        routeCoordinates: [], // Backend doesn't store this in history yet
      }));
    },
    refetchInterval: 10000,
  });
}
