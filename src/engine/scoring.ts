/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  JourneyStyle,
  RouteCandidate,
  VehiclePreset,
  StopAmenity,
  PlannedStop,
  RefineOptions,
  LowestBufferPoint,
  CostBreakdown,
  OvernightHaltRecommendation,
} from '../types';

export interface StyleWeights {
  time: number;
  cost: number;
  comfort: number;
  stop: number;
}

export const SCORING_WEIGHTS: Record<JourneyStyle | 'Default', StyleWeights> = {
  Default: { time: 0.35, cost: 0.25, comfort: 0.20, stop: 0.20 },
  Fast:    { time: 0.50, cost: 0.20, comfort: 0.15, stop: 0.15 },
  Cheap:   { time: 0.20, cost: 0.50, comfort: 0.15, stop: 0.15 },
  Comfort: { time: 0.20, cost: 0.20, comfort: 0.30, stop: 0.30 },
};

/**
 * Pure calculation of composite score from normalized metrics (0-1)
 */
export function calculateWeightedScore(
  timeScore: number,
  costScore: number,
  comfortScore: number,
  stopScore: number,
  weights: StyleWeights
): number {
  return Number(
    (
      weights.time * timeScore +
      weights.cost * costScore +
      weights.comfort * comfortScore +
      weights.stop * stopScore
    ).toFixed(4)
  );
}

/**
 * Normalizes an array of route candidates relative to the minimum time and minimum cost in the set.
 * Supports custom / learned Bradley-Terry personalized weights.
 */
export function normalizeAndScoreCandidates(
  candidates: RouteCandidate[],
  activeStyle: JourneyStyle | 'Default' = 'Default',
  customWeights?: StyleWeights
): RouteCandidate[] {
  if (candidates.length === 0) return [];

  const minTime = Math.min(...candidates.map((c) => c.totalDurationMinutes));
  const minCost = Math.min(...candidates.map((c) => Math.max(1, c.totalCostInr)));

  return candidates.map((c) => {
    // Normalization: timeScore = minTime / time; costScore = minCost / cost
    const timeScore = Number((minTime / Math.max(1, c.totalDurationMinutes)).toFixed(4));
    const costScore = Number((minCost / Math.max(1, c.totalCostInr)).toFixed(4));
    const comfortScore = Math.min(1, Math.max(0, c.comfortScore));
    const stopQualityScore = Math.min(1, Math.max(0, c.stopQualityScore));

    const scoresByStyle = {
      Default: calculateWeightedScore(timeScore, costScore, comfortScore, stopQualityScore, SCORING_WEIGHTS.Default),
      Fast: calculateWeightedScore(timeScore, costScore, comfortScore, stopQualityScore, SCORING_WEIGHTS.Fast),
      Cheap: calculateWeightedScore(timeScore, costScore, comfortScore, stopQualityScore, SCORING_WEIGHTS.Cheap),
      Comfort: calculateWeightedScore(timeScore, costScore, comfortScore, stopQualityScore, SCORING_WEIGHTS.Comfort),
    };

    const compositeScore = customWeights
      ? calculateWeightedScore(timeScore, costScore, comfortScore, stopQualityScore, customWeights)
      : scoresByStyle[activeStyle];

    return {
      ...c,
      timeScore,
      costScore,
      comfortScore,
      stopQualityScore,
      scoresByStyle,
      compositeScore,
    };
  });
}

/**
 * Calculates stop quality proxy score (0 to 1) based on real tags from Overpass / OCM.
 * Never hallucinated or faked. Accommodates refine preferences.
 */
export function computeStopQualityScore(
  stops: StopAmenity[],
  isEv: boolean,
  refine?: Partial<RefineOptions>
): number {
  if (stops.length === 0) return 0.35; // Baseline when minimal stops tagged on highway

  let totalPoints = 0;
  for (const s of stops) {
    let itemScore = 0.2; // base presence
    if (s.hasToilets) itemScore += 0.15;
    if (s.hasFood) itemScore += 0.15;
    if (s.isOpen24x7) itemScore += 0.15;
    if (s.hasParking) itemScore += 0.10;
    if (s.brand && s.brand.length > 0) itemScore += 0.10;
    if (s.hasLighting || s.isWheelchairAccessible) itemScore += 0.05;

    // Refine boosts
    if (refine?.cleanWashrooms && (s.hasToilets || s.isWheelchairAccessible)) {
      itemScore += 0.10;
    }
    if (refine?.vegFood && (s.isVegFriendly || s.hasFood)) {
      itemScore += 0.10;
    }
    if (refine?.familyFriendly && (s.isOpen24x7 && s.hasLighting && s.hasParking)) {
      itemScore += 0.15;
    }
    if (refine?.petFriendly && s.isPetFriendly) {
      itemScore += 0.10;
    }

    if (isEv && s.type === 'ev_charger') {
      if ((s.chargerPowerKw || 0) >= 50) itemScore += 0.25;
      else if ((s.chargerPowerKw || 0) >= 22) itemScore += 0.15;
      if (s.ocmStatus === 'Operational') itemScore += 0.15;
    }

    totalPoints += Math.min(1.0, itemScore);
  }

  const average = totalPoints / stops.length;
  const countFactor = Math.min(1.0, stops.length / 5);
  return Number((average * 0.7 + countFactor * 0.3).toFixed(3));
}

/**
 * Calculates comfort proxy score (0 to 1)
 */
export function computeComfortScore(params: {
  expresswayFraction: number; // 0-1
  surfaceQualityScore: number; // 0-1
  tollPlazaCount: number;
  stepsCount: number;
  distanceKm: number;
  stopsCount: number;
  departureHour?: number;
}): number {
  const {
    expresswayFraction,
    surfaceQualityScore,
    tollPlazaCount,
    stepsCount,
    distanceKm,
    stopsCount,
    departureHour = 9,
  } = params;

  const expresswayScore = Math.min(1, Math.max(0, expresswayFraction));
  const turnsPer100km = distanceKm > 0 ? (stepsCount / distanceKm) * 100 : 10;
  const turnsScore = Math.max(0.1, Math.min(1.0, 1.0 - (turnsPer100km - 5) / 25));
  const tollFrictionScore = Math.max(0.2, Math.min(1.0, 1.0 - tollPlazaCount * 0.06));
  const surfaceScore = surfaceQualityScore;
  const stopsPer100km = distanceKm > 0 ? (stopsCount / distanceKm) * 100 : 0;
  const stopSpacingScore = stopsPer100km >= 0.8 ? 0.95 : stopsPer100km >= 0.4 ? 0.75 : 0.45;

  const isNight = departureHour >= 21 || departureHour < 5;
  const nightFactor = isNight ? 0.85 : 1.0;

  const rawComfort =
    expresswayScore * 0.30 +
    surfaceScore * 0.25 +
    turnsScore * 0.15 +
    tollFrictionScore * 0.15 +
    stopSpacingScore * 0.15;

  return Number(Math.min(1.0, Math.max(0.1, rawComfort * nightFactor)).toFixed(3));
}

/**
 * Plans required stops for EV or Fuel vehicles with full details:
 * Detour minutes, distance off route, arrival % and after %, safe to skip rationale.
 */
export function planJourneyStops(
  distanceKm: number,
  drivingDurationMin: number,
  vehicle: VehiclePreset,
  availableStops: StopAmenity[],
  initialChargePercent: number = 80,
  refine?: Partial<RefineOptions>,
  departureTime?: string
): {
  plannedStops: PlannedStop[];
  totalStopDurationMinutes: number;
  additionalCostInr: number;
  lowestBufferPoint: LowestBufferPoint;
  cngWarning?: boolean;
  unreachableGapNotice?: string;
  overnightHalt?: OvernightHaltRecommendation;
} {
  const planned: PlannedStop[] = [];
  let stopDuration = 0;
  let additionalCost = 0;
  let cngWarning = false;
  let unreachableGapNotice: string | undefined = undefined;

  let lowestRemainingPercent = initialChargePercent;
  let lowestBufferKm = Math.round(distanceKm * 0.5);
  let lowestLocationName = 'Midpoint Corridor';
  let lowestStatus: 'safe' | 'caution' | 'critical' = 'safe';

  // Parse departure time in India context
  const depDate = departureTime ? new Date(departureTime) : new Date();
  const depHour = depDate.getHours();
  const depMinute = depDate.getMinutes();

  if (vehicle.fuelType === 'EV') {
    const reserveBufferKm = vehicle.realWorldRangeKm * 0.12;
    let currentBatteryPercent = initialChargePercent;
    let distanceCovered = 0;

    const evChargers = availableStops
      .filter((s) => s.type === 'ev_charger')
      .sort((a, b) => a.distanceFromOriginKm - b.distanceFromOriginKm);

    while (distanceCovered < distanceKm) {
      const remainingRangeKm = (vehicle.realWorldRangeKm * (currentBatteryPercent / 100)) - reserveBufferKm;
      
      // If remaining range can reach destination safely with buffer, stop planning chargers
      if (distanceCovered + remainingRangeKm >= distanceKm) {
        const destArrivalPercent = Math.max(0, Math.round(currentBatteryPercent - ((distanceKm - distanceCovered) / vehicle.realWorldRangeKm) * 100));
        if (destArrivalPercent < lowestRemainingPercent) {
          lowestRemainingPercent = destArrivalPercent;
          lowestBufferKm = distanceKm;
          lowestLocationName = 'Destination arrival';
        }
        break;
      }

      // We need a charge stop
      const targetKm = distanceCovered + remainingRangeKm * 0.82;
      const candidates = evChargers.filter(
        (c) => c.distanceFromOriginKm > distanceCovered + 15 && c.distanceFromOriginKm <= targetKm + 35
      );
      const chosen = candidates[candidates.length - 1] || evChargers.find((c) => c.distanceFromOriginKm > distanceCovered);

      if (!chosen) {
        // Zero-synthetic rule: No verified charger exists along this stretch in live data
        unreachableGapNotice = `No verified DC fast chargers tagged along this highway corridor segment (~${Math.round(distanceCovered + remainingRangeKm)} km). Suggestion: Add a charging waypoint or choose a longer-range vehicle.`;
        const destArrivalPercent = Math.max(0, Math.round(currentBatteryPercent - ((distanceKm - distanceCovered) / vehicle.realWorldRangeKm) * 100));
        if (destArrivalPercent < lowestRemainingPercent) {
          lowestRemainingPercent = destArrivalPercent;
          lowestBufferKm = distanceKm;
          lowestLocationName = 'Corridor battery depletion point';
        }
        break;
      }

      const stopKm = chosen.distanceFromOriginKm;
      const segmentDistance = Math.max(1, stopKm - distanceCovered);
      const batteryUsedPercent = (segmentDistance / vehicle.realWorldRangeKm) * 100;
      const arrivalPercent = Math.max(0, Math.round(currentBatteryPercent - batteryUsedPercent));

      if (arrivalPercent < lowestRemainingPercent) {
        lowestRemainingPercent = arrivalPercent;
        lowestBufferKm = stopKm;
        lowestLocationName = chosen.name;
      }

      const chargingSpeed = chosen.chargerPowerKw || vehicle.chargingSpeedKw || 50;
      const kwhNeeded = Number(((vehicle.tankOrBatteryCapacity * (85 - arrivalPercent)) / 100).toFixed(1));
      const chargeMinutes = Math.round((kwhNeeded / chargingSpeed) * 60) + 8; // +8 handshake
      const chargeCost = Math.round(kwhNeeded * 20.5); // ₹20.50/kWh highway fast charge

      const arrivalMinutes = Math.round((stopKm / distanceKm) * drivingDurationMin);
      const arrivalHours = Math.floor(arrivalMinutes / 60);
      const arrivalMins = arrivalMinutes % 60;

      const detourMinutes = chosen.detourMinutes || 2;
      const detourMeters = chosen.detourDistanceMeters || 120;

      // Safe to skip logic
      const distToNext = (distanceKm - stopKm);
      const canReachDestinationOrNext = (vehicle.realWorldRangeKm * (arrivalPercent / 100)) > (distToNext + reserveBufferKm);
      const isSafeToSkip = canReachDestinationOrNext && arrivalPercent > 35;
      const skipRationale = isSafeToSkip
        ? `Safe to skip if maintaining ≤80 km/h: buffer to destination is +${Math.round((vehicle.realWorldRangeKm * (arrivalPercent / 100)) - distToNext)} km.`
        : `Crucial stop: remaining battery (${arrivalPercent}%) provides ${Math.round(vehicle.realWorldRangeKm * (arrivalPercent / 100))} km range, insufficient for next ${Math.round(distToNext)} km.`;

      planned.push({
        stop: chosen,
        type: 'charge',
        arrivalTimeFormatted: `${arrivalHours}h ${arrivalMins}m`,
        arrivalMinutesFromStart: arrivalMinutes,
        durationMinutes: chargeMinutes,
        costInr: chargeCost,
        chargeAddedKwh: kwhNeeded,
        chargePercentageAfter: 85,
        fuelOrBatteryOnArrivalPercent: arrivalPercent,
        fuelOrBatteryAfterPercent: 85,
        detourMinutes,
        distanceFromRouteMeters: detourMeters,
        isSafeToSkip,
        skipRationale,
      });

      stopDuration += chargeMinutes;
      additionalCost += chargeCost;
      distanceCovered = stopKm;
      currentBatteryPercent = 85;
    }
  } else {
    // Petrol, Diesel, CNG
    const tankRange = vehicle.realWorldRangeKm;
    const cngStations = availableStops.filter((s) => s.type === 'cng');

    if (vehicle.fuelType === 'CNG' && distanceKm > 140 && cngStations.length < 2) {
      cngWarning = true;
    }

    let currentFuelPercent = 85;
    let distanceCovered = 0;

    // Refuel stops if trip exceeds 75% of single-tank range
    if (distanceKm > tankRange * 0.75) {
      const targetKm = tankRange * 0.70;
      const refuelStops = availableStops.filter((s) =>
        vehicle.fuelType === 'CNG' ? s.type === 'cng' : s.type === 'fuel'
      );
      const chosen = refuelStops.find((s) => s.distanceFromOriginKm >= targetKm * 0.5) || refuelStops[0];

      if (chosen) {
        const stopKm = chosen.distanceFromOriginKm;
        const arrivalMinutes = Math.round((stopKm / distanceKm) * drivingDurationMin);
        const arrivalHours = Math.floor(arrivalMinutes / 60);
        const arrivalMins = arrivalMinutes % 60;

        const arrivalPercent = Math.max(10, Math.round(currentFuelPercent - (stopKm / tankRange) * 100));
        lowestRemainingPercent = Math.min(lowestRemainingPercent, arrivalPercent);
        lowestBufferKm = stopKm;
        lowestLocationName = chosen.name;

        const stopMinutes = vehicle.fuelType === 'CNG' ? 20 : 12; // CNG queue allowance
        const detourMinutes = chosen.detourMinutes || 2;
        const detourMeters = chosen.detourDistanceMeters || 80;

        planned.push({
          stop: chosen,
          type: 'refuel',
          arrivalTimeFormatted: `${arrivalHours}h ${arrivalMins}m`,
          arrivalMinutesFromStart: arrivalMinutes,
          durationMinutes: stopMinutes,
          costInr: 0, // Fuel counted in candidate energy cost
          fuelAddedLitersOrKg: Number((vehicle.tankOrBatteryCapacity * 0.8).toFixed(1)),
          fuelOrBatteryOnArrivalPercent: arrivalPercent,
          fuelOrBatteryAfterPercent: 95,
          detourMinutes,
          distanceFromRouteMeters: detourMeters,
          isSafeToSkip: arrivalPercent > 35,
          skipRationale: arrivalPercent > 35
            ? `Safe to postpone if required; remaining fuel range is ~${Math.round((arrivalPercent / 100) * tankRange)} km.`
            : `Recommended refuel stop: tank reserves approaching reserve threshold (~${arrivalPercent}%).`,
        });

        stopDuration += stopMinutes;
        distanceCovered = stopKm;
        currentFuelPercent = 95;
      }
    }

    // Meal & refreshment windows (Lunch: ~12:30-2:30 PM, Dinner: ~7:30-9:30 PM, or trip >= 240 mins)
    const isLongTrip = drivingDurationMin >= 180;
    const preferMeal = refine?.preferMealWindows ?? true;

    if (isLongTrip && preferMeal) {
      // Find food stops along corridor
      let foodStops = availableStops.filter((s) => s.type === 'food' || s.hasFood || s.type === 'rest_area');
      if (refine?.vegFood) {
        // Prioritize vegetarian options if available
        const vegOnly = foodStops.filter((s) => s.isVegFriendly || s.name.toLowerCase().includes('veg'));
        if (vegOnly.length > 0) foodStops = vegOnly;
      }

      // Check if trip time crosses lunch (~13:00) or dinner (~20:00)
      const depTotalMins = depHour * 60 + depMinute;
      let targetElapsedMins = Math.round(0.45 * drivingDurationMin); // Default mid-trip

      const lunchElapsed = (13 * 60) - depTotalMins;
      const dinnerElapsed = (20 * 60) - depTotalMins;

      if (lunchElapsed >= 45 && lunchElapsed <= drivingDurationMin - 45) {
        targetElapsedMins = lunchElapsed;
      } else if (dinnerElapsed >= 45 && dinnerElapsed <= drivingDurationMin - 45) {
        targetElapsedMins = dinnerElapsed;
      }

      const targetKm = (targetElapsedMins / drivingDurationMin) * distanceKm;
      const chosenFoodStop =
        foodStops.find((s) => Math.abs(s.distanceFromOriginKm - targetKm) < distanceKm * 0.25) ||
        foodStops[0];

      if (chosenFoodStop) {
        const arrivalHours = Math.floor(targetElapsedMins / 60);
        const arrivalMins = targetElapsedMins % 60;
        const mealTitle = targetElapsedMins === lunchElapsed ? 'Lunch Window' : targetElapsedMins === dinnerElapsed ? 'Dinner Window' : 'Rest & Refreshment';

        planned.push({
          stop: chosenFoodStop,
          type: 'meal_rest',
          arrivalTimeFormatted: `${arrivalHours}h ${arrivalMins}m`,
          arrivalMinutesFromStart: targetElapsedMins,
          durationMinutes: 35,
          costInr: 250,
          fuelOrBatteryOnArrivalPercent: Math.max(15, Math.round(currentFuelPercent - (targetKm / tankRange) * 100)),
          fuelOrBatteryAfterPercent: Math.max(15, Math.round(currentFuelPercent - (targetKm / tankRange) * 100)),
          detourMinutes: 1,
          distanceFromRouteMeters: 50,
          isSafeToSkip: true,
          skipRationale: `${mealTitle}: Planned during optimal meal window to preserve driver alertness and passenger comfort.`,
        });

        stopDuration += 35;
        additionalCost += 250;
      }
    }
  }

  // Overnight Halt Evaluation ("Avoid driving after 10 pm")
  let overnightHalt: OvernightHaltRecommendation | undefined = undefined;
  const totalTripMinutes = drivingDurationMin + stopDuration;
  const depTotalMins = depHour * 60 + depMinute;
  const arrTotalMins = depTotalMins + totalTripMinutes;
  const tenPmMins = 22 * 60; // 10:00 PM

  // If trip extends past 10:00 PM or user has nightDrivingHalt enabled
  if (refine?.nightDrivingHalt || (arrTotalMins > tenPmMins && totalTripMinutes > 300)) {
    const minsTo10Pm = Math.max(60, tenPmMins - depTotalMins);
    const haltKm = Math.min(distanceKm - 40, Math.max(40, Math.round((minsTo10Pm / totalTripMinutes) * distanceKm)));

    // Find lodging/hotel options tagged in stops near halt distance
    const lodgingStops = availableStops.filter(
      (s) => s.type === 'rest_area' || s.name.toLowerCase().includes('hotel') || s.name.toLowerCase().includes('resort')
    );

    overnightHalt = {
      needed: true,
      townName: lodgingStops[0]?.name || `Corridor Highway Hub (~${haltKm} km)`,
      kmFromOrigin: haltKm,
      lat: lodgingStops[0]?.lat,
      lon: lodgingStops[0]?.lon,
      haltTimeFormatted: '10:00 PM',
      resumeTimeFormatted: '06:00 AM (Next Morning)',
      hotels: lodgingStops.slice(0, 3),
      rationale:
        'Avoids hazardous night cruising on national highways after 10 PM. Suggested halt allows 8 hours restful recovery before daylight resumption at 6 AM.',
    };
  }

  if (lowestRemainingPercent < 15) lowestStatus = 'critical';
  else if (lowestRemainingPercent < 25) lowestStatus = 'caution';
  else lowestStatus = 'safe';

  const lowestBufferPoint: LowestBufferPoint = {
    kmFromOrigin: lowestBufferKm,
    percentRemaining: lowestRemainingPercent,
    rangeKmRemaining: Math.round((lowestRemainingPercent / 100) * vehicle.realWorldRangeKm),
    locationName: lowestLocationName,
    rationale:
      lowestRemainingPercent < 20
        ? `Lowest safety margin: drops to ${lowestRemainingPercent}% (~${Math.round((lowestRemainingPercent / 100) * vehicle.realWorldRangeKm)} km) near ${lowestLocationName}. Stop scheduled before this threshold.`
        : `Safe energy buffer: maintains at least ${lowestRemainingPercent}% (~${Math.round((lowestRemainingPercent / 100) * vehicle.realWorldRangeKm)} km reserve) throughout the route.`,
    status: lowestStatus,
  };

  return {
    plannedStops: planned,
    totalStopDurationMinutes: stopDuration,
    additionalCostInr: Math.round(additionalCost),
    lowestBufferPoint,
    cngWarning,
    unreachableGapNotice,
    overnightHalt,
  };
}

export interface TollConfig {
  returnDiscountPercent: number; // default 25
  returnWindowHours: number; // default 24
  label: string; // 'Estimated, verify with NHAI'
}

export const DEFAULT_TOLL_CONFIG: TollConfig = {
  returnDiscountPercent: 25,
  returnWindowHours: 24,
  label: 'Estimated, verify with NHAI',
};

/**
 * Computes cost breakdown, per-person split, round-trip, and EV vs Petrol savings.
 */
export function calculateCostBreakdown(
  energyCostInr: number,
  tollCostInr: number,
  stopCostInr: number,
  passengers: number = 1,
  vehicle: VehiclePreset,
  distanceKm: number,
  petrolPricePerLiter: number = 104,
  tollConfig: TollConfig = DEFAULT_TOLL_CONFIG
): CostBreakdown {
  const safePassengers = Math.max(1, Math.min(7, passengers));
  const totalCostInr = energyCostInr + tollCostInr + stopCostInr;
  const perPersonCostInr = Math.round(totalCostInr / safePassengers);

  // Return trip FASTag concession (configurable rule: e.g. 25% discount on return leg within 24h at NHAI plazas)
  const returnLegToll = Math.round(tollCostInr * (1 - tollConfig.returnDiscountPercent / 100));
  const roundTripToll = tollCostInr + returnLegToll;
  const roundTripCostInr = (energyCostInr * 2) + roundTripToll + (stopCostInr * 2);

  // EV vs Petrol comparison for the trip:
  // Equivalent petrol car consuming ~15 km/L
  const petrolEquivalentLitres = distanceKm / 15.0;
  const petrolEquivalentCost = Math.round(petrolEquivalentLitres * petrolPricePerLiter);

  let evSavingsVsPetrolInr = 0;
  if (vehicle.fuelType === 'EV') {
    evSavingsVsPetrolInr = Math.max(0, petrolEquivalentCost - energyCostInr);
  } else {
    // How much would an EV save compared to this car?
    const evEquivalentKwh = distanceKm / 6.5; // ~6.5 km/kWh
    const evEquivalentCost = Math.round(evEquivalentKwh * 20.5); // ₹20.5/kWh fast charging
    evSavingsVsPetrolInr = Math.max(0, energyCostInr - evEquivalentCost);
  }

  return {
    energyCostInr,
    tollCostInr,
    stopRefreshmentCostInr: stopCostInr,
    totalCostInr,
    passengers: safePassengers,
    perPersonCostInr,
    roundTripCostInr,
    evSavingsVsPetrolInr,
    tollConcessionNote: `FASTag return concession: ~${tollConfig.returnDiscountPercent}% rebate applies if returning within ${tollConfig.returnWindowHours}h at eligible NHAI plazas (${tollConfig.label}).`,
  };
}

/**
 * Generates deterministic comparison and explanation between the winning route and the runner-up.
 * Format requirement:
 * "Route B: 9 min slower, ₹250 cheaper, better stops." plus 2–3 "why" bullets and a "What you give up" line.
 */
export function generateDeterministicExplanation(
  candidates: RouteCandidate[],
  style: JourneyStyle,
  vehicle: VehiclePreset
): {
  headline: string;
  subheadline: string;
  whyBullets: string[];
  whatYouGiveUp: string;
  deterministicProof: string;
} {
  if (candidates.length === 0) {
    return {
      headline: 'No route candidate available',
      subheadline: 'Please verify origin and destination are connected by highway network.',
      whyBullets: [],
      whatYouGiveUp: 'None',
      deterministicProof: 'Zero candidates returned.',
    };
  }

  const sorted = [...candidates].sort((a, b) => b.compositeScore - a.compositeScore);
  const winner = sorted[0];
  const runnerUp = sorted[1] || winner;

  const winnerStopsCount = winner.plannedStops?.length || 0;
  const runnerUpStopsCount = runnerUp.plannedStops?.length || 0;

  // Clean road name (removes any "(Live Traffic)" tags)
  const cleanRoadName = (winner.name || 'Primary Highway')
    .replace(/\s*\([^)]*Traffic[^)]*\)/gi, '')
    .trim();

  let headline = '';
  const diffTime = winner.totalDurationMinutes - runnerUp.totalDurationMinutes;
  const diffCost = winner.totalCostInr - runnerUp.totalCostInr;

  if (candidates.length <= 1 || winner.id === runnerUp.id) {
    if (winnerStopsCount === 0) {
      headline = `${cleanRoadName}: direct highway route, no stop needed on this route.`;
    } else {
      headline = `${cleanRoadName}: direct highway route with ${winnerStopsCount} verified stop${winnerStopsCount > 1 ? 's' : ''}.`;
    }
  } else {
    let timeWording = '';
    if (Math.abs(diffTime) <= 2) {
      timeWording = 'same travel time';
    } else if (diffTime < 0) {
      timeWording = `${Math.abs(diffTime)} min faster`;
    } else {
      timeWording = `${diffTime} min slower`;
    }

    let costWording = '';
    if (Math.abs(diffCost) <= 20) {
      costWording = 'comparable cost';
    } else if (diffCost < 0) {
      costWording = `₹${Math.abs(diffCost)} cheaper`;
    } else {
      costWording = `₹${diffCost} more expensive`;
    }

    // Stop quality rule:
    // Only say "better stops" when stop-quality score is actually higher AND the plan has at least one stop.
    // For a plan with 0 stops, say "no stop needed on this route" and omit any stop-quality claim.
    let stopWording = '';
    if (winnerStopsCount === 0) {
      stopWording = 'no stop needed on this route';
    } else if (winner.stopQualityScore > runnerUp.stopQualityScore && winnerStopsCount > 0) {
      stopWording = 'better stops';
    } else if (winner.stopQualityScore < runnerUp.stopQualityScore) {
      stopWording = 'fewer stop amenities';
    } else {
      stopWording = `${winnerStopsCount} verified stop${winnerStopsCount > 1 ? 's' : ''}`;
    }

    headline = `${cleanRoadName}: ${timeWording}, ${costWording}, ${stopWording}.`;
  }

  const weights = SCORING_WEIGHTS[style];
  const subheadline = `Ranked #1 by NaviFlow ${style} policy (${Math.round(weights.time * 100)}% Time, ${Math.round(weights.cost * 100)}% Cost, ${Math.round(weights.comfort * 100)}% Comfort, ${Math.round(weights.stop * 100)}% Stops).`;

  const whyBullets: string[] = [];

  if (winner.expresswayFraction >= 0.4) {
    whyBullets.push(
      `${Math.round(winner.expresswayFraction * 100)}% expressway corridor offering smoother access control and reduced stop-and-go fatigue.`
    );
  } else {
    whyBullets.push(
      `Direct national highway alignment with steady cruising speed and minimal detour penalty.`
    );
  }

  if (winner.trafficDelayMinutes && winner.trafficDelayMinutes > 15) {
    whyBullets.push(
      `Monitored live traffic shows ${winner.trafficDelayMinutes} min bottleneck, factored directly into ETA.`
    );
  } else if (winner.trafficSource === 'Live traffic' || (winner.trafficSource as string) === 'TomTom') {
    whyBullets.push(`Live traffic confirms free-flowing corridor with zero severe jam delays.`);
  } else {
    whyBullets.push(`Normal travel time computed via highway network matrices (No live traffic).`);
  }

  if (vehicle.fuelType === 'EV') {
    whyBullets.push(
      `EV charging plan ensures safe arrival with lowest buffer point at ${winner.lowestBufferPoint?.percentRemaining ?? 20}% battery.`
    );
  } else if (winner.tollCostInr < runnerUp.tollCostInr) {
    whyBullets.push(`Saves ₹${runnerUp.tollCostInr - winner.tollCostInr} on FASTag toll plazas along this alignment.`);
  } else if (winnerStopsCount === 0) {
    whyBullets.push(`Direct non-stop cruise: distance is comfortably within your vehicle's range.`);
  } else {
    whyBullets.push(`Strategically spaced highway amenities with verified restrooms and food plazas.`);
  }

  let whatYouGiveUp = 'None: dominant across all multi-attribute dimensions.';
  if (diffCost > 50) {
    whatYouGiveUp = `You pay ₹${diffCost} more in tolls and fuel to gain ${Math.abs(Math.min(0, diffTime))} minutes faster transit.`;
  } else if (diffTime > 5) {
    whatYouGiveUp = `You spend ${diffTime} extra minutes on the road to save ₹${Math.abs(diffCost)} in highway tolls.`;
  } else if (winner.stepsCount > runnerUp.stepsCount + 10) {
    whatYouGiveUp = `Slightly more turns (${winner.stepsCount} steps) compared to the runner-up (${runnerUp.stepsCount} steps).`;
  }

  const deterministicProof = `Transparent Weighted Scoring: ${winner.compositeScore.toFixed(4)} vs ${runnerUp.compositeScore.toFixed(4)} | TimeScore: ${winner.timeScore} | CostScore: ${winner.costScore} | Comfort: ${winner.comfortScore} | Stops: ${winner.stopQualityScore}`;

  return {
    headline,
    subheadline,
    whyBullets: whyBullets.slice(0, 3),
    whatYouGiveUp,
    deterministicProof,
  };
}

/**
 * Generates fatigue hints, night-driving warnings, and environmental advisories
 */
export function generateFatigueAlerts(
  drivingDurationMinutes: number,
  departureTime?: string,
  weather?: any[]
): { title: string; desc: string; severity: 'warning' | 'info' }[] {
  const alerts: { title: string; desc: string; severity: 'warning' | 'info' }[] = [];

  if (drivingDurationMinutes >= 120) {
    alerts.push({
      title: 'Fatigue Break Recommended',
      desc: `Continuous highway driving exceeds ${Math.floor(drivingDurationMinutes / 60)}h. Take a 15–20 minute hydration & stretch break every 2 hours to avoid driver fatigue.`,
      severity: 'info',
    });
  }

  const departureDate = departureTime ? new Date(departureTime) : new Date();
  const depHour = departureDate.getHours();
  const arrDate = new Date(departureDate.getTime() + drivingDurationMinutes * 60 * 1000);
  const arrHour = arrDate.getHours();

  if (depHour >= 20 || depHour < 5 || arrHour >= 22 || arrHour < 5) {
    alerts.push({
      title: 'Night Driving Advisory',
      desc: 'Journey spans late night or pre-dawn hours. Watch for unlit vehicles, stray cattle, and oncoming high-beam glare. Reduce speed by 10-15 km/h.',
      severity: 'warning',
    });
  }

  if (weather && weather.some((w: any) => w.isRainWarning)) {
    alerts.push({
      title: 'Monsoon / Wet Surface Caution',
      desc: 'Showers or wet road segments detected along route corridor. Increase following distance to 4+ seconds to prevent aquaplaning.',
      severity: 'warning',
    });
  } else if (weather && weather.some((w: any) => w.isHeatWarning)) {
    alerts.push({
      title: 'High Heat / Tyre Blowout Alert',
      desc: 'Ambient highway temperatures reach or exceed 38°C. Ensure cold tyre pressures are calibrated; avoid continuous top-speed expressway cruising.',
      severity: 'info',
    });
  }

  return alerts;
}

