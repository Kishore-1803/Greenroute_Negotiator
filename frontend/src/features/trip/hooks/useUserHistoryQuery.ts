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
  route_geometry: z.array(z.array(z.number())).optional().default([]),
  eco_score: z.number().optional().default(85.0),
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

      const modeInfo = (m: string) => {
        switch (m) {
          case 'metro': return { name: 'Metro Rail', icon: '🚇' };
          case 'bus': return { name: 'Public Bus', icon: '🚌' };
          case 'two_wheeler': return { name: 'Two-Wheeler', icon: '⚡' };
          case 'cycling': return { name: 'Bicycle', icon: '🚲' };
          case 'car':
          default:
            return { name: 'Car', icon: '🚗' };
        }
      };

      return data.map(dto => ({
        id: dto.trip_id,
        origin: dto.origin_name || 'Origin',
        destination: dto.destination_name || 'Destination',
        distanceKm: dto.distance_km,
        mode: modeInfo(dto.selected_mode),
        timestamp: new Date(dto.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        durationMin: dto.duration_min ? Math.round(dto.duration_min) : 0,
        costInr: Math.round(dto.cost_inr),
        carbonG: Math.round(dto.carbon_g),
        avoidedCarbonG: Math.round(dto.carbon_saved_vs_car_g),
        avoidedText: `-${Math.round(dto.carbon_saved_vs_car_g)}g avoided`,
        routeCoordinates: (dto.route_geometry as [number, number][]) || [],
        ecoScore: dto.eco_score,
      }));
    },
    refetchInterval: 5000,
  });
}
