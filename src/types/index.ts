/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VehicleFuelType = 'Petrol' | 'Diesel' | 'CNG' | 'EV';

export type JourneyStyle = 'Fast' | 'Cheap' | 'Comfort';

export interface VehiclePreset {
  id: string;
  name: string;
  category: 'Car' | 'SUV' | 'Hatchback' | 'Sedan' | 'Two-Wheeler';
  fuelType: VehicleFuelType;
  tankOrBatteryCapacity: number; // Liters for Petrol/Diesel, kg for CNG, kWh for EV
  efficiency: number; // km/L for Petrol/Diesel, km/kg for CNG, km/kWh for EV
  realWorldRangeKm: number;
  chargingSpeedKw?: number; // For EV
  fastChargeSupported?: boolean;
}

export interface Coordinates {
  lat: number;
  lon: number;
  name: string;
  state?: string;
  country?: string;
}

export type DataSourceType = 'Live' | 'Web-sourced' | 'Estimated';

export interface SourceAttribution {
  type: DataSourceType;
  provider: string;
  timestamp: string;
  notes?: string;
}

export interface StopAmenity {
  id: string;
  name: string;
  type: 'fuel' | 'cng' | 'ev_charger' | 'food' | 'toilets' | 'rest_area' | 'parking' | 'toll';
  lat: number;
  lon: number;
  distanceFromOriginKm: number;
  brand?: string;
  hasToilets?: boolean;
  hasFood?: boolean;
  isOpen24x7?: boolean;
  hasParking?: boolean;
  isWheelchairAccessible?: boolean;
  hasLighting?: boolean;
  chargerPowerKw?: number;
  connectorType?: string;
  operator?: string;
  ocmStatus?: string;
  tollFeeEstimatedInr?: number;
  comfortContributionScore: number; // 0-1
}

export interface PlannedStop {
  stop: StopAmenity;
  type: 'refuel' | 'charge' | 'meal_rest' | 'toll_pass';
  arrivalTimeFormatted: string;
  durationMinutes: number;
  costInr: number;
  chargeAddedKwh?: number;
  chargePercentageAfter?: number;
  fuelAddedLitersOrKg?: number;
}

export interface RouteCandidate {
  id: string;
  name: string;
  summary: string;
  distanceKm: number;
  drivingDurationMinutes: number;
  trafficDurationMinutes?: number;
  trafficDelayMinutes?: number;
  trafficSource: 'TomTom' | 'No live traffic';
  geometry: [number, number][]; // [lat, lon][]
  stepsCount: number;
  expresswayFraction: number; // 0 to 1
  surfaceQualityScore: number; // 0 to 1
  tollPlazas: StopAmenity[];
  tollCostInr: number;
  tollSource: SourceAttribution;
  
  // Stops found along corridor
  allStops: StopAmenity[];
  plannedStops: PlannedStop[];
  stopQualityScore: number; // 0 to 1
  
  // Total computed metrics
  energyConsumedUnits: number; // Liters, kg, or kWh
  energyCostInr: number;
  energySource: SourceAttribution;
  totalCostInr: number; // energyCostInr + tollCostInr
  totalDurationMinutes: number; // driving + stop times + traffic delays
  comfortScore: number; // 0 to 1
  
  // Normalized component scores (0 to 1)
  timeScore: number;
  costScore: number;
  
  // Final weighted scores
  scoresByStyle: {
    Fast: number;
    Cheap: number;
    Comfort: number;
    Default: number;
  };
  compositeScore: number; // Score matching current active style
  
  routingProvider?: 'TomTom' | 'OSRM';
  isBestOverall?: boolean;
  isFastest?: boolean;
  isCheapest?: boolean;
}

export interface JourneyPlanResult {
  origin: Coordinates;
  destination: Coordinates;
  vehicle: VehiclePreset;
  journeyStyle: JourneyStyle;
  departureTime: string;
  candidates: RouteCandidate[];
  recommendedRouteId: string;
  explanation: {
    headline: string;
    subheadline: string;
    whyBullets: string[];
    whatYouGiveUp: string;
    deterministicProof: string;
  };
  metadata: {
    generatedAt: string;
    indiaTimeFormatted: string;
    routingProvider: 'TomTom' | 'OSRM';
    tomtomQuotaExceeded?: boolean;
    fuelPricesUsed: {
      petrol: number;
      diesel: number;
      cng: number;
      electricityPerKwh: number;
      source: SourceAttribution;
    };
    providerHealth: Record<string, 'ok' | 'degraded' | 'unavailable'>;
  };
}

export interface TestRunReport {
  testId: string;
  title: string;
  description: string;
  status: 'PASS' | 'FAIL';
  executionTimeMs: number;
  requestPayload: any;
  responseSummary: any;
  weightsUsed: { time: number; cost: number; comfort: number; stop: number };
  observedResult: string;
  timestamp: string;
  appVersion: string;
  details?: string;
}
