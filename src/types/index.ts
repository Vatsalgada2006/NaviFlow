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

export interface RefineOptions {
  passengers: number; // 1 to 7, default 1 (used for per-person cost split)
  avoidTolls: boolean;
  vegFood: boolean;
  cleanWashrooms: boolean;
  familyFriendly: boolean; // prefer well-lit, busy stops
  petFriendly: boolean;
  viaStops?: Coordinates[]; // Up to 3 waypoints
  arriveByTime?: string; // Target arrival time e.g. "18:00"
  nightDrivingHalt?: boolean; // Avoid driving after 10 pm with overnight halt
  preferMealWindows?: boolean; // Lunch 12:30-2:30 PM & Dinner 7:30-9:30 PM alignment
}

export interface StopAmenity {
  id: string;
  name: string;
  type: 'fuel' | 'cng' | 'ev_charger' | 'food' | 'toilets' | 'rest_area' | 'parking' | 'toll' | 'hospital' | 'police' | 'repair';
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
  isVegFriendly?: boolean;
  isFamilyFriendly?: boolean;
  isPetFriendly?: boolean;
  chargerPowerKw?: number;
  connectorType?: string;
  operator?: string;
  ocmStatus?: string;
  tollFeeEstimatedInr?: number;
  tollName?: string;
  comfortContributionScore: number; // 0-1
  detourMinutes?: number; // Time added by leaving route (1-5 min)
  detourDistanceMeters?: number; // Distance off highway (e.g. 100m)
  isSafeToSkip?: boolean;
  skipReason?: string;
}

export interface PlannedStop {
  stop: StopAmenity;
  type: 'refuel' | 'charge' | 'meal_rest' | 'toll_pass' | 'break';
  arrivalTimeFormatted: string;
  arrivalMinutesFromStart: number;
  durationMinutes: number;
  costInr: number;
  chargeAddedKwh?: number;
  chargePercentageAfter?: number;
  fuelAddedLitersOrKg?: number;
  fuelOrBatteryOnArrivalPercent: number;
  fuelOrBatteryAfterPercent: number;
  detourMinutes: number;
  distanceFromRouteMeters: number;
  isSafeToSkip: boolean;
  skipRationale: string;
}

export interface LowestBufferPoint {
  kmFromOrigin: number;
  percentRemaining: number;
  rangeKmRemaining: number;
  locationName: string;
  rationale: string;
  status: 'safe' | 'caution' | 'critical';
}

export interface CostBreakdown {
  energyCostInr: number;
  tollCostInr: number;
  stopRefreshmentCostInr: number;
  totalCostInr: number;
  passengers: number;
  perPersonCostInr: number;
  roundTripCostInr: number;
  evSavingsVsPetrolInr: number; // if EV: saved vs petrol; if Petrol: potential savings with EV
  tollConcessionNote: string;
}

export interface RouteCandidate {
  id: string;
  name: string;
  summary: string;
  distanceKm: number;
  drivingDurationMinutes: number;
  trafficDurationMinutes?: number;
  trafficDelayMinutes?: number;
  trafficSource: 'Live traffic' | 'Normal travel time (No live traffic)' | 'TomTom' | 'No live traffic';
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
  unreachableGapNotice?: string;
  stopsUnavailableNotice?: string;
  
  // Total computed metrics
  energyConsumedUnits: number; // Liters, kg, or kWh
  energyCostInr: number;
  energySource: SourceAttribution;
  totalCostInr: number; // energyCostInr + tollCostInr + stop costs
  totalDurationMinutes: number; // driving + stop times + traffic delays
  comfortScore: number; // 0 to 1
  
  // Lowest buffer point along journey
  lowestBufferPoint: LowestBufferPoint;
  costBreakdown: CostBreakdown;

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
  
  routingProvider?: 'TomTom' | 'OSRM' | string;
  isBestOverall?: boolean;
  isFastest?: boolean;
  isCheapest?: boolean;
  weather?: WeatherPoint[];
  safetyFacilities?: SafetyFacility[];
  fatigueAlerts?: { title: string; desc: string; severity: 'warning' | 'info' }[];
  overnightHalt?: OvernightHaltRecommendation;
}

export interface WeatherPoint {
  lat: number;
  lon: number;
  locationName: string;
  tempC: number;
  weatherCode: number;
  conditionText: string;
  precipitationMm: number;
  windSpeedKmh: number;
  isRainWarning: boolean;
  isHeatWarning: boolean;
}

export interface SafetyFacility {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'repair' | 'tyres';
  lat: number;
  lon: number;
  distanceFromOriginKm: number;
  phone?: string;
  isOpen24x7?: boolean;
}

export interface DepartureTimeSlot {
  slotId: string;
  departureTime: string;
  label: string; // "Now", "+1 Hour", "+2 Hours"
  departureTimeFormatted: string;
  durationMinutes: number;
  delayMinutes: number;
  etaFormatted: string;
  isRecommended: boolean;
  recommendationReason: string;
  trafficSummary: string;
  source: 'Live traffic' | 'Historical Estimate' | 'TomTom Live';
}

export interface JourneyPlanResult {
  origin: Coordinates;
  destination: Coordinates;
  vehicle: VehiclePreset;
  journeyStyle: JourneyStyle;
  refineOptions: RefineOptions;
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
    providerHealth: Record<string, 'ok' | 'degraded' | 'unavailable' | 'active'>;
  };
}

export interface IssueReportPayload {
  reportId?: string;
  originName: string;
  destinationName: string;
  routeId?: string;
  stopName?: string;
  category: 'toll_rate_wrong' | 'charger_offline' | 'fuel_unavailable' | 'road_closure' | 'inaccurate_time' | 'other';
  description: string;
  userContact?: string;
  reportedAt: string;
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

export interface OvernightHaltRecommendation {
  needed: boolean;
  townName?: string;
  lat?: number;
  lon?: number;
  haltTimeFormatted?: string;
  arrivalTimeFormatted?: string;
  resumeTimeFormatted?: string;
  nextMorningDepartureFormatted?: string;
  distanceFromOriginKm?: number;
  kmFromOrigin?: number;
  reason?: string;
  rationale: string;
  hotels?: StopAmenity[];
}

export interface PersonalizedWeights {
  time: number;
  cost: number;
  comfort: number;
  stop: number;
  isPersonalized: boolean;
  sampleCount: number;
  explanation: string;
}

export interface ChoiceLogEntry {
  id: string;
  timestamp: string;
  routeId: string;
  action: 'save' | 'open_maps' | 'share';
  features: {
    timeScore: number;
    costScore: number;
    comfortScore: number;
    stopScore: number;
  };
  otherCandidatesFeatures: {
    timeScore: number;
    costScore: number;
    comfortScore: number;
    stopScore: number;
  }[];
}

export interface TripQuestionResponse {
  question: string;
  answer: string;
  relevantStopIds?: string[];
  referencedStops?: string[];
  verifiedNumeric?: boolean;
  verifiedNumericFacts?: boolean;
  sourceNote: string;
}

export interface FeedbackStatsResponse {
  totalCount: number;
  thumbsUp: number;
  thumbsDown: number;
  satisfactionPercent: number;
  reasonCounts: Record<string, number>;
}

export interface TripFeedbackPayload {
  id?: string;
  rating: 'up' | 'down';
  reasons: string[];
  comment?: string;
  routeSummary: string;
  timestamp: string;
}

export interface ParsedTripSentence {
  origin?: string;
  destination?: string;
  vehicleId?: string;
  journeyStyle?: JourneyStyle;
  departureTime?: string;
  viaStops?: string[];
  constraints?: {
    avoidTolls?: boolean;
    vegFood?: boolean;
    cleanWashrooms?: boolean;
    familyFriendly?: boolean;
    petFriendly?: boolean;
    nightDrivingHalt?: boolean;
    arriveBy?: string;
  };
  rawText: string;
}

