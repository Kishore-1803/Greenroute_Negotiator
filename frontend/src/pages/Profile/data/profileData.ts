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
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'aarav_sharma',
  name: 'Aarav Sharma',
  personalityTag: 'Eco-Smart Daily Commuter',
  location: 'Coimbatore, TN',
  memberSince: 'August 2026',
  sustainabilityStatus: {
    level: 'SUSTAINABILITY STATUS',
    title: 'Level 1 Green Starter',
  },
  preferredModes: [
    { id: 'ev_two_wheeler', label: 'EV Two-Wheeler', icon: '⚡' },
    { id: 'city_bus', label: 'City Bus / Transit', icon: '🚌' },
    { id: 'urban_bicycle', label: 'Urban Bicycle', icon: '🚲' },
  ],
  stats: {
    avoidedCo2Kg: 1.6,
    costSavedInr: 525,
    lowCarbonRatePercent: 100,
    totalJourneys: 6,
    greenChoices: 6,
    treesEquivalent: 1,
    vehicleTripsPrevented: 2,
  },
};

export const MOCK_JOURNEYS: JourneyRecord[] = [
  {
    id: 'trip_01',
    origin: 'Gandhipuram Central Bus Stand',
    destination: 'TIDEL Park Coimbatore',
    distanceKm: 8.4,
    mode: {
      name: 'City Express Bus',
      icon: '🚌',
    },
    timestamp: 'Today, 8:30 AM',
    durationMin: 38,
    costInr: 15,
    carbonG: 110,
    avoidedCarbonG: 320,
    avoidedText: '-320g avoided',
    routeCoordinates: [
      [76.9665, 11.0168],
      [76.9740, 11.0185],
      [76.9860, 11.0215],
      [76.9980, 11.0248],
      [77.0120, 11.0270],
      [77.0260, 11.0282],
      [77.0360, 11.0260],
      [77.0398, 11.0238],
    ],
  },
  {
    id: 'trip_02',
    origin: 'Peelamedu Airport Road',
    destination: 'RS Puram West',
    distanceKm: 9.1,
    mode: {
      name: 'Electric Two-Wheeler',
      icon: '⚡',
    },
    timestamp: 'Today, 6:15 PM',
    durationMin: 24,
    costInr: 8,
    carbonG: 35,
    avoidedCarbonG: 285,
    avoidedText: '-285g avoided',
    routeCoordinates: [
      [77.0350, 11.0310],
      [77.0180, 11.0265],
      [77.0000, 11.0220],
      [76.9810, 11.0145],
      [76.9630, 11.0075],
      [76.9510, 11.0090],
      [76.9450, 11.0120],
    ],
  },
  {
    id: 'trip_03',
    origin: 'Saravanampatti Tech Zone',
    destination: 'Gandhipuram Central Bus Stand',
    distanceKm: 11.2,
    mode: {
      name: 'City Express Bus',
      icon: '🚌',
    },
    timestamp: 'Yesterday, 8:45 AM',
    durationMin: 42,
    costInr: 18,
    carbonG: 135,
    avoidedCarbonG: 410,
    avoidedText: '-410g avoided',
    routeCoordinates: [
      [76.9980, 11.0790],
      [76.9910, 11.0640],
      [76.9840, 11.0490],
      [76.9770, 11.0340],
      [76.9710, 11.0240],
      [76.9665, 11.0168],
    ],
  },
  {
    id: 'trip_04',
    origin: 'PSG Tech Peelamedu',
    destination: 'Race Course Promenade',
    distanceKm: 5.4,
    mode: {
      name: 'Smart Bicycle',
      icon: '🚲',
    },
    timestamp: 'Yesterday, 5:30 PM',
    durationMin: 22,
    costInr: 0,
    carbonG: 0,
    avoidedCarbonG: 380,
    avoidedText: '-380g avoided',
    routeCoordinates: [
      [77.0028, 11.0245],
      [76.9940, 11.0200],
      [76.9850, 11.0130],
      [76.9780, 11.0060],
      [76.9720, 11.0020],
    ],
  },
  {
    id: 'trip_05',
    origin: 'Ramanathapuram Junction',
    destination: 'Eachanari Tech Corridor',
    distanceKm: 7.8,
    mode: {
      name: 'Electric Two-Wheeler',
      icon: '⚡',
    },
    timestamp: '2 days ago, 10:15 AM',
    durationMin: 19,
    costInr: 7,
    carbonG: 28,
    avoidedCarbonG: 260,
    avoidedText: '-260g avoided',
    routeCoordinates: [
      [76.9880, 10.9920],
      [76.9820, 10.9760],
      [76.9750, 10.9610],
      [76.9700, 10.9480],
      [76.9650, 10.9380],
    ],
  },
  {
    id: 'trip_06',
    origin: 'Saibaba Colony',
    destination: 'Brookefields Plaza',
    distanceKm: 3.6,
    mode: {
      name: 'Urban Bicycle',
      icon: '🚲',
    },
    timestamp: '3 days ago, 4:00 PM',
    durationMin: 14,
    costInr: 0,
    carbonG: 0,
    avoidedCarbonG: 210,
    avoidedText: '-210g avoided',
    routeCoordinates: [
      [76.9420, 11.0280],
      [76.9480, 11.0230],
      [76.9530, 11.0160],
      [76.9580, 11.0100],
    ],
  },
];
