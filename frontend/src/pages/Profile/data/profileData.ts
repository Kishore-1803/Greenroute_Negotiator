export interface PreferredMode {
  id: string;
  label: string;
  icon: string;
}

export interface UserProfile {
  id: string;
  name: string;
  personalityTag: string;
  location: string;
  memberSince: string;
  sustainabilityStatus: {
    level: string;
    title: string;
  };
  avatarUrl?: string;
  preferredModes: PreferredMode[];
  stats: {
    avoidedCo2Kg: number;
    costSavedInr: number;
    lowCarbonRatePercent: number;
    totalJourneys: number;
    greenChoices: number;
    treesEquivalent: number;
    vehicleTripsPrevented: number;
  };
}

export interface JourneyRecord {
  id: string;
  origin: string;
  destination: string;
  destinationHighlight?: string;
  distanceKm: number;
  mode: {
    name: string;
    icon: string;
    badgeStyle?: string;
  };
  timestamp: string;
  durationMin: number;
  costInr: number;
  carbonG: number;
  avoidedCarbonG: number;
  avoidedText?: string;
  routeCoordinates: [number, number][]; // [lon, lat] pairs
  ecoScore?: number;
}
