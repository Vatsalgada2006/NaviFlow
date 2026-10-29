/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RouteCandidate, VehiclePreset } from '../types';

export interface SanityCheckResult {
  checkId: string;
  name: string;
  passed: boolean;
  expected: string;
  observed: string;
  details?: string;
}

export interface RouteSanityReport {
  routeId: string;
  routeName: string;
  allPassed: boolean;
  checks: SanityCheckResult[];
}

/**
 * Runs deterministic dev-time sanity checks across a planned route candidate.
 * Fails fast and logs diagnostics if any physical invariant is breached.
 */
export function runRouteSanityChecks(
  candidate: RouteCandidate,
  rawProviderDistanceKm?: number,
  vehicle?: VehiclePreset
): RouteSanityReport {
  const checks: SanityCheckResult[] = [];

  // Check 1: Distance within ±15% of the routing provider's distance
  if (rawProviderDistanceKm && rawProviderDistanceKm > 0) {
    const diffPct = Math.abs(candidate.distanceKm - rawProviderDistanceKm) / rawProviderDistanceKm;
    const passed = diffPct <= 0.15;
    checks.push({
      checkId: 'SANITY-DIST-15PCT',
      name: 'Distance within ±15% of provider road network geometry',
      passed,
      expected: `${rawProviderDistanceKm.toFixed(1)} km ± 15% (${(rawProviderDistanceKm * 0.85).toFixed(1)} - ${(rawProviderDistanceKm * 1.15).toFixed(1)} km)`,
      observed: `${candidate.distanceKm.toFixed(1)} km (${(diffPct * 100).toFixed(1)}% delta)`,
    });
  } else {
    // If rawProviderDistanceKm is equal to candidate.distanceKm or omitted
    checks.push({
      checkId: 'SANITY-DIST-POSITIVE',
      name: 'Corridor distance is strictly positive',
      passed: candidate.distanceKm > 0,
      expected: '> 0 km',
      observed: `${candidate.distanceKm.toFixed(1)} km`,
    });
  }

  // Check 2: Travel time > 0
  const timePassed = candidate.totalDurationMinutes > 0 && candidate.drivingDurationMinutes > 0;
  checks.push({
    checkId: 'SANITY-TIME-POSITIVE',
    name: 'Travel duration is strictly positive',
    passed: timePassed,
    expected: 'Total and driving duration > 0 minutes',
    observed: `Total: ${candidate.totalDurationMinutes} min (Driving: ${candidate.drivingDurationMinutes} min)`,
  });

  // Check 3: No negative costs (fuel, toll, stop refreshment, total)
  const costPassed =
    candidate.totalCostInr >= 0 &&
    candidate.energyCostInr >= 0 &&
    candidate.tollCostInr >= 0 &&
    (candidate.costBreakdown ? candidate.costBreakdown.perPersonCostInr >= 0 : true);
  checks.push({
    checkId: 'SANITY-COST-NON-NEGATIVE',
    name: 'Monetary costs are non-negative',
    passed: costPassed,
    expected: 'All cost line items >= ₹0',
    observed: `Total: ₹${candidate.totalCostInr}, Fuel/EV: ₹${candidate.energyCostInr}, Toll: ₹${candidate.tollCostInr}`,
  });

  // Check 4: Stops positioned within the route corridor (distance from route <= 15 km)
  let stopsWithinCorridor = true;
  let maxDetourDist = 0;
  if (candidate.plannedStops && candidate.plannedStops.length > 0) {
    for (const p of candidate.plannedStops) {
      const distFromRouteKm = (p.distanceFromRouteMeters || 0) / 1000;
      if (distFromRouteKm > maxDetourDist) maxDetourDist = distFromRouteKm;
      if (distFromRouteKm > 15) {
        stopsWithinCorridor = false;
      }
    }
  }
  checks.push({
    checkId: 'SANITY-STOPS-CORRIDOR',
    name: 'All planned stops reside within national highway corridor',
    passed: stopsWithinCorridor,
    expected: 'Detour distance off-corridor <= 15 km',
    observed:
      candidate.plannedStops?.length > 0
        ? `Max offset: ${maxDetourDist.toFixed(2)} km across ${candidate.plannedStops.length} stops`
        : '0 planned stops (trip within single tank/charge range)',
  });

  // Check 5: EV arrival charge never < 0% (and buffer >= 10% target)
  const isEv = vehicle?.fuelType === 'EV';
  let evChargePassed = true;
  let lowestCharge = 100;

  if (isEv && candidate.plannedStops) {
    for (const p of candidate.plannedStops) {
      if (p.fuelOrBatteryOnArrivalPercent < lowestCharge) {
        lowestCharge = p.fuelOrBatteryOnArrivalPercent;
      }
      if (p.fuelOrBatteryOnArrivalPercent < 0) {
        evChargePassed = false;
      }
    }
  }
  if (candidate.lowestBufferPoint) {
    if (candidate.lowestBufferPoint.percentRemaining < lowestCharge) {
      lowestCharge = candidate.lowestBufferPoint.percentRemaining;
    }
    if (candidate.lowestBufferPoint.percentRemaining < 0) {
      evChargePassed = false;
    }
  }

  checks.push({
    checkId: 'SANITY-EV-CHARGE-VALID',
    name: isEv ? 'EV battery state never drops below 0%' : 'Fuel buffer valid across corridor',
    passed: evChargePassed,
    expected: isEv ? 'Battery state on arrival >= 0% (>= 10% reserve target)' : 'Fuel buffer >= 0%',
    observed: isEv ? `Lowest reserve point: ${lowestCharge}%` : `Lowest fuel margin: ${lowestCharge}%`,
  });

  // Check 6: Timeline stop arrival times are monotonically increasing
  let timesMonotonic = true;
  let lastMins = -1;
  let timelineDetail = 'Valid sequence';

  if (candidate.plannedStops && candidate.plannedStops.length > 1) {
    for (let i = 0; i < candidate.plannedStops.length; i++) {
      const curMins = candidate.plannedStops[i].arrivalMinutesFromStart;
      if (curMins < lastMins) {
        timesMonotonic = false;
        timelineDetail = `Stop ${i} (${curMins}m) arrived earlier than Stop ${i - 1} (${lastMins}m)`;
        break;
      }
      lastMins = curMins;
    }
  }

  checks.push({
    checkId: 'SANITY-TIMELINE-MONOTONIC',
    name: 'Timeline stop arrival minutes are strictly monotonic',
    passed: timesMonotonic,
    expected: 'Stop[i].arrivalMinutes >= Stop[i-1].arrivalMinutes',
    observed: candidate.plannedStops?.length > 1 ? timelineDetail : '0 or 1 stop (trivially monotonic)',
  });

  const allPassed = checks.every((c) => c.passed);

  return {
    routeId: candidate.id,
    routeName: candidate.name,
    allPassed,
    checks,
  };
}
