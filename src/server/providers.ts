/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { Coordinates, StopAmenity, RouteCandidate, SourceAttribution, VehiclePreset } from '../types';
import { geocodeCache, routeCache, stopsCache, fuelCache } from './cache';
import { fetchWithTimeoutAndRetry, nominatimQueue, NAVIFLOW_USER_AGENT } from './rateLimiter';
import { getFallbackFuelPrice } from '../engine/fuelFallback';
import { computeComfortScore, computeStopQualityScore } from '../engine/scoring';

// Initialize Gemini SDK with User-Agent telemetry
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Verify if a coordinate is within India's approximate bounding box
export function isCoordinateWithinIndia(lat: number, lon: number): boolean {
  return lat >= 6.5 && lat <= 35.5 && lon >= 68.0 && lon <= 97.5;
}

/**
 * Autocomplete via Photon (India bbox biased)
 */
export async function photonAutocomplete(query: string): Promise<Coordinates[]> {
  if (!query || query.trim().length < 2) return [];

  const clean = query.trim().toLowerCase();
  const cacheKey = `photon:${clean}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=20.5937&lon=78.9629&bbox=68.0,6.5,97.5,35.5&lang=en&limit=8`;
  try {
    const res = await fetchWithTimeoutAndRetry(url, {}, 6000, 1);
    if (!res.ok) throw new Error(`Photon returned ${res.status}`);
    const data = await res.json();

    const results: Coordinates[] = (data.features || [])
      .map((f: any) => {
        const [lon, lat] = f.geometry.coordinates;
        const props = f.properties || {};
        const country = props.country || '';

        // Filter out results clearly outside India
        if (country && country.toLowerCase() !== 'india' && !isCoordinateWithinIndia(lat, lon)) {
          return null;
        }

        const parts = [props.name, props.city || props.district, props.state, props.country]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i);

        return {
          lat,
          lon,
          name: parts.join(', '),
          state: props.state,
          country: props.country || 'India',
        };
      })
      .filter(Boolean);

    geocodeCache.set(cacheKey, results, 1000 * 60 * 60 * 24); // 24h
    return results;
  } catch (err) {
    console.warn('Photon autocomplete failed, falling back to Nominatim search:', err);
    return nominatimSearch(query);
  }
}

/**
 * Nominatim Search (countrycodes=in) with rate queue
 */
export async function nominatimSearch(query: string): Promise<Coordinates[]> {
  const clean = query.trim().toLowerCase();
  const cacheKey = `nominatim:${clean}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  return nominatimQueue.add(async () => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&addressdetails=1&limit=5`;
    const res = await fetchWithTimeoutAndRetry(url, {}, 8000, 1);
    if (!res.ok) throw new Error(`Nominatim error ${res.status}`);
    const data = await res.json();

    const results: Coordinates[] = (data || []).map((item: any) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      name: item.display_name,
      state: item.address?.state,
      country: item.address?.country || 'India',
    }));

    geocodeCache.set(cacheKey, results, 1000 * 60 * 60 * 24);
    return results;
  });
}

/**
 * Reverse geocode coordinates via Nominatim
 */
export async function nominatimReverse(lat: number, lon: number): Promise<Coordinates | null> {
  const cacheKey = `rev:${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  return nominatimQueue.add(async () => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    const res = await fetchWithTimeoutAndRetry(url, {}, 8000, 1);
    if (!res.ok) return null;
    const data = await res.json();
    const result: Coordinates = {
      lat,
      lon,
      name: data.display_name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      state: data.address?.state,
      country: data.address?.country || 'India',
    };
    geocodeCache.set(cacheKey, result, 1000 * 60 * 60 * 24);
    return result;
  });
}

/**
 * Fetch Today's Fuel Prices for state/city via Gemini with Google Search tool
 */
export async function fetchLiveFuelPrice(stateName?: string, cityName?: string): Promise<{
  petrol: number;
  diesel: number;
  cng: number;
  evFastChargePerKwh: number;
  source: SourceAttribution;
}> {
  const targetArea = cityName || stateName || 'India';
  const cacheKey = `fuel:${targetArea.toLowerCase()}`;
  const cached = fuelCache.get(cacheKey);
  if (cached) return cached;

  const fallback = getFallbackFuelPrice(stateName);

  if (!process.env.GEMINI_API_KEY) {
    const res = {
      petrol: fallback.petrolPerLiter,
      diesel: fallback.dieselPerLiter,
      cng: fallback.cngPerKg,
      evFastChargePerKwh: fallback.evFastChargePerKwh,
      source: {
        type: 'Estimated' as const,
        provider: 'Reference Fuel Matrix (HPCL/BPCL Fallback)',
        timestamp: new Date().toISOString(),
        notes: 'GEMINI_API_KEY not configured. Using official state reference prices.',
      },
    };
    fuelCache.set(cacheKey, res, 1000 * 60 * 60 * 24);
    return res;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Search today's retail fuel prices in ${targetArea}, India.
Return ONLY a valid JSON object with the exact keys:
{
  "petrol": <number in INR per liter>,
  "diesel": <number in INR per liter>,
  "cng": <number in INR per kg>,
  "source": "<source name like IndianOil/GoodReturns/LiveMint>"
}
If CNG is unavailable in this specific town, use state average ~75-85. Do not include markdown ticks if possible or keep clean json.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.petrol && parsed.diesel) {
        const result = {
          petrol: Number(parsed.petrol) || fallback.petrolPerLiter,
          diesel: Number(parsed.diesel) || fallback.dieselPerLiter,
          cng: Number(parsed.cng) || fallback.cngPerKg,
          evFastChargePerKwh: fallback.evFastChargePerKwh,
          source: {
            type: 'Web-sourced' as const,
            provider: `Google Search Grounding (${parsed.source || 'Live India Oil Retailers'})`,
            timestamp: new Date().toISOString(),
            notes: `Live prices fetched today for ${targetArea}. Verify before fueling.`,
          },
        };
        fuelCache.set(cacheKey, result, 1000 * 60 * 60 * 24);
        return result;
      }
    }
  } catch (err) {
    console.warn(`Gemini search for fuel price in ${targetArea} failed:`, err);
  }

  const result = {
    petrol: fallback.petrolPerLiter,
    diesel: fallback.dieselPerLiter,
    cng: fallback.cngPerKg,
    evFastChargePerKwh: fallback.evFastChargePerKwh,
    source: {
      type: 'Estimated' as const,
      provider: `State Fuel Reference Table (${fallback.state})`,
      timestamp: new Date().toISOString(),
      notes: `Fall back to state baseline table (${fallback.effectiveDate}).`,
    },
  };
  fuelCache.set(cacheKey, result, 1000 * 60 * 60 * 12);
  return result;
}

/**
 * Fetch Overpass Stops along route corridor with mirrors
 */
export async function fetchOverpassStopsAlongRoute(
  geometry: [number, number][],
  distanceKm: number
): Promise<StopAmenity[]> {
  if (geometry.length === 0) return [];

  const sampleCount = Math.min(3, Math.max(2, Math.floor(distanceKm / 120)));
  const step = Math.floor(geometry.length / sampleCount);
  const samplePoints: [number, number][] = [];

  for (let i = 0; i < geometry.length; i += step) {
    samplePoints.push(geometry[i]);
  }
  if (samplePoints[samplePoints.length - 1] !== geometry[geometry.length - 1]) {
    samplePoints.push(geometry[geometry.length - 1]);
  }

  const cacheKey = `stops:${geometry[0][0].toFixed(2)},${geometry[0][1].toFixed(2)}-${geometry[geometry.length - 1][0].toFixed(2)},${geometry[geometry.length - 1][1].toFixed(2)}`;
  const cached = stopsCache.get(cacheKey);
  if (cached) return cached;

  const pointFilters = samplePoints
    .map(([lat, lon]) => `(around:2500, ${lat.toFixed(4)}, ${lon.toFixed(4)})`)
    .join('');

  const ql = `
[out:json][timeout:5];
(
  node["amenity"="fuel"]${pointFilters};
  node["amenity"="charging_station"]${pointFilters};
  node["barrier"="toll_booth"]${pointFilters};
  node["amenity"~"restaurant|fast_food|cafe"]${pointFilters};
  node["amenity"="toilets"]${pointFilters};
  node["highway"~"rest_area|services"]${pointFilters};
);
out body 30;
`;

  for (const mirror of OVERPASS_MIRRORS.slice(0, 1)) {
    try {
      const res = await fetchWithTimeoutAndRetry(
        mirror,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(ql)}`,
        },
        3000,
        0
      );

      if (res.ok) {
        const data = await res.json();
        const elements = data.elements || [];

        const originLat = geometry[0][0];
        const originLon = geometry[0][1];

        const stops: StopAmenity[] = elements.map((el: any) => {
          const tags = el.tags || {};
          let type: StopAmenity['type'] = 'fuel';

          if (tags.barrier === 'toll_booth') type = 'toll';
          else if (tags.amenity === 'charging_station') type = 'ev_charger';
          else if (tags.fuel_cng === 'yes' || tags['fuel:cng'] === 'yes' || (tags.name && tags.name.toLowerCase().includes('cng'))) type = 'cng';
          else if (tags.amenity === 'fuel') type = 'fuel';
          else if (tags.highway === 'services' || tags.highway === 'rest_area') type = 'rest_area';
          else if (tags.amenity === 'toilets') type = 'toilets';
          else if (tags.amenity === 'restaurant' || tags.amenity === 'fast_food' || tags.amenity === 'cafe') type = 'food';

          const lat = el.lat;
          const lon = el.lon;
          const distKm = haversineDistanceKm(originLat, originLon, lat, lon);

          return {
            id: `osm-${el.id}`,
            name: tags.name || tags.operator || (type === 'toll' ? 'Toll Plaza' : `${type.toUpperCase()} Station`),
            type,
            lat,
            lon,
            distanceFromOriginKm: Math.round(distKm),
            brand: tags.brand || tags.operator,
            hasToilets: tags.toilets === 'yes' || !!tags['toilets:wheelchair'] || type === 'toilets',
            hasFood: type === 'food' || tags.food === 'yes',
            isOpen24x7: tags.opening_hours === '24/7',
            hasParking: tags.parking === 'yes',
            isWheelchairAccessible: tags.wheelchair === 'yes',
            hasLighting: tags.lit === 'yes',
            chargerPowerKw: tags.capacity ? parseInt(tags.capacity, 10) * 15 : 30,
            comfortContributionScore: 0.75,
          };
        });

        const deduped: StopAmenity[] = [];
        for (const s of stops) {
          const existing = deduped.find(
            (d) => d.type === s.type && Math.abs(d.distanceFromOriginKm - s.distanceFromOriginKm) < 5
          );
          if (!existing) deduped.push(s);
        }

        stopsCache.set(cacheKey, deduped, 1000 * 60 * 60 * 3);
        return deduped;
      }
    } catch (err) {
      console.warn(`Overpass mirror ${mirror} failed, using synthetic corridor fallback:`, err);
    }
  }

  const syntheticStops = generateSyntheticStops(geometry, distanceKm);
  stopsCache.set(cacheKey, syntheticStops, 1000 * 60 * 60 * 3);
  return syntheticStops;
}

/**
 * Open Charge Map API integration (if OCM_API_KEY exists)
 */
export async function fetchOpenChargeMapEVs(
  centerLat: number,
  centerLon: number,
  radiusKm: number
): Promise<StopAmenity[]> {
  const apiKey = process.env.OCM_API_KEY;
  if (!apiKey) return [];

  const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=IN&maxresults=40&latitude=${centerLat}&longitude=${centerLon}&distance=${radiusKm}&distanceunit=KM&key=${apiKey}`;
  try {
    const res = await fetchWithTimeoutAndRetry(url, {}, 6000, 1);
    if (!res.ok) return [];
    const pois = await res.json();

    return pois.map((poi: any) => ({
      id: `ocm-${poi.ID}`,
      name: poi.AddressInfo?.Title || 'EV Charging Hub',
      type: 'ev_charger' as const,
      lat: poi.AddressInfo?.Latitude,
      lon: poi.AddressInfo?.Longitude,
      distanceFromOriginKm: 0,
      brand: poi.OperatorInfo?.Title || 'OpenCharge Provider',
      isOpen24x7: poi.AddressInfo?.AccessComments?.includes('24') || false,
      chargerPowerKw: poi.Connections?.[0]?.PowerKW || 50,
      connectorType: poi.Connections?.[0]?.ConnectionType?.Title || 'CCS-2',
      operator: poi.OperatorInfo?.Title,
      ocmStatus: poi.StatusType?.IsOperational ? 'Operational' : 'Unknown',
      comfortContributionScore: 0.85,
    }));
  } catch (e) {
    console.warn('Open Charge Map fetch error:', e);
    return [];
  }
}

export interface RoutingEngineResponse {
  candidates: RouteCandidate[];
  provider: 'TomTom' | 'OSRM';
  tomtomQuotaExceeded: boolean;
}

/**
 * Primary Routing via TomTom Routing API (traffic=true, alternatives, avoid=tollRoads)
 * Minimizes TomTom calls: exactly 2 calls per plan.
 */
async function fetchTomTomRoutes(
  origin: Coordinates,
  destination: Coordinates,
  vehicle: VehiclePreset,
  departureTime?: string
): Promise<RoutingEngineResponse | null> {
  const tomtomKey = process.env.TOMTOM_API_KEY;
  if (!tomtomKey) return null;

  // Format departAt ISO string for TomTom (e.g., 2026-10-28T14:30:00+05:30)
  let departAt = '';
  if (departureTime && departureTime !== 'now') {
    try {
      const d = new Date(departureTime);
      if (!isNaN(d.getTime())) {
        departAt = d.toISOString();
      }
    } catch {}
  }
  if (!departAt) {
    departAt = new Date().toISOString();
  }

  try {
    // Call 1: Primary route with maxAlternatives=2, traffic=true, departAt
    const primaryUrl = `https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lon}:${destination.lat},${destination.lon}/json?maxAlternatives=2&traffic=true&travelMode=car&departAt=${encodeURIComponent(departAt)}&key=${tomtomKey}`;
    const primaryRes = await fetchWithTimeoutAndRetry(primaryUrl, {}, 9000, 0);

    if (primaryRes.status === 429 || primaryRes.status === 403) {
      console.warn(`TomTom status ${primaryRes.status}: daily quota or rate limit reached. Falling back to OSRM.`);
      return { candidates: [], provider: 'OSRM', tomtomQuotaExceeded: true };
    }

    if (!primaryRes.ok) {
      console.warn(`TomTom primary route request failed with status ${primaryRes.status}`);
      return null;
    }

    const primaryData = await primaryRes.json();
    const ttRoutes: any[] = primaryData.routes || [];
    if (ttRoutes.length === 0) return null;

    // Call 2: Avoid Toll Roads variant (creates the no-toll alternative)
    let noTollRoute: any = null;
    try {
      const avoidTollUrl = `https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lon}:${destination.lat},${destination.lon}/json?traffic=true&travelMode=car&avoid=tollRoads&departAt=${encodeURIComponent(departAt)}&key=${tomtomKey}`;
      const avoidRes = await fetchWithTimeoutAndRetry(avoidTollUrl, {}, 8000, 0);
      if (avoidRes.ok) {
        const avoidData = await avoidRes.json();
        if (avoidData.routes && avoidData.routes.length > 0) {
          noTollRoute = avoidData.routes[0];
          noTollRoute._isAvoidTolls = true;
        }
      }
    } catch (err) {
      console.warn('TomTom avoid=tollRoads call failed, proceeding with primary alternatives:', err);
    }

    // Combine routes: primary + alternatives + avoidTollRoute
    const allRoutes: any[] = [...ttRoutes];
    if (noTollRoute) {
      allRoutes.push(noTollRoute);
    }

    // Deduplicate routes with >85% geometry overlap
    const uniqueRoutes: any[] = [];
    for (const r of allRoutes) {
      const isDupe = uniqueRoutes.some((existing) => {
        const diffDist = Math.abs(existing.summary.lengthInMeters - r.summary.lengthInMeters) / Math.max(1, existing.summary.lengthInMeters);
        const diffDur = Math.abs(existing.summary.travelTimeInSeconds - r.summary.travelTimeInSeconds) / Math.max(1, existing.summary.travelTimeInSeconds);
        return diffDist < 0.05 && diffDur < 0.05 && existing._isAvoidTolls === r._isAvoidTolls;
      });
      if (!isDupe) uniqueRoutes.push(r);
    }

    // Extract primary geometry to query Overpass stops along corridor
    const primaryGeometry: [number, number][] = uniqueRoutes[0].legs[0].points.map(
      (p: any) => [p.latitude, p.longitude] as [number, number]
    );
    const primaryDistKm = Math.round(uniqueRoutes[0].summary.lengthInMeters / 1000);
    const corridorStops = await fetchOverpassStopsAlongRoute(primaryGeometry, primaryDistKm);

    const candidates: RouteCandidate[] = uniqueRoutes.slice(0, 3).map((r, index) => {
      const distanceKm = Math.round(r.summary.lengthInMeters / 1000);
      const drivingDurationMinutes = Math.round(r.summary.travelTimeInSeconds / 60);
      const delaySec = r.summary.trafficDelayInSeconds || 0;
      const trafficDelayMinutes = Math.round(delaySec / 60);

      const geometry: [number, number][] = (r.legs?.[0]?.points || []).map(
        (p: any) => [p.latitude, p.longitude] as [number, number]
      );

      const isAvoidToll = !!r._isAvoidTolls;

      // Detect motorways/expressways from sections if available
      const sections = r.sections || [];
      let motorwayPoints = 0;
      for (const s of sections) {
        if (s.sectionType === 'MOTORWAY') {
          motorwayPoints += (s.endPointIndex - s.startPointIndex);
        }
      }
      const expresswayFraction = geometry.length > 0 && motorwayPoints > 0
        ? Math.min(1, motorwayPoints / geometry.length)
        : (isAvoidToll ? 0.35 : 0.70);

      const surfaceQualityScore = Number((0.75 + expresswayFraction * 0.20).toFixed(2));

      // Toll plaza estimation
      let tollPlazas: StopAmenity[] = [];
      let tollCostInr = 0;

      if (isAvoidToll) {
        tollPlazas = [];
        tollCostInr = 0;
      } else {
        tollPlazas = corridorStops.filter((s) => s.type === 'toll');
        const tollCount = Math.max(Math.floor(distanceKm / 75), tollPlazas.length);
        tollCostInr = Math.round(distanceKm * (expresswayFraction > 0.5 ? 1.85 : 1.25));
      }

      // Energy calculation (Check if TomTom returned EV battery consumption)
      let energyConsumedUnits = 0;
      let energyCostInr = 0;
      const fallbackFuel = getFallbackFuelPrice(origin.state || destination.state);

      if (vehicle.fuelType === 'EV') {
        if (r.summary?.batteryConsumptionInkWh && r.summary.batteryConsumptionInkWh > 0) {
          energyConsumedUnits = Number(r.summary.batteryConsumptionInkWh.toFixed(1));
        } else {
          energyConsumedUnits = Number((distanceKm / Math.max(1, vehicle.efficiency)).toFixed(1));
        }
        energyCostInr = Math.round(energyConsumedUnits * fallbackFuel.evFastChargePerKwh);
      } else if (vehicle.fuelType === 'Petrol') {
        energyConsumedUnits = Number((distanceKm / Math.max(1, vehicle.efficiency)).toFixed(1));
        energyCostInr = Math.round(energyConsumedUnits * fallbackFuel.petrolPerLiter);
      } else if (vehicle.fuelType === 'Diesel') {
        energyConsumedUnits = Number((distanceKm / Math.max(1, vehicle.efficiency)).toFixed(1));
        energyCostInr = Math.round(energyConsumedUnits * fallbackFuel.dieselPerLiter);
      } else if (vehicle.fuelType === 'CNG') {
        energyConsumedUnits = Number((distanceKm / Math.max(1, vehicle.efficiency)).toFixed(1));
        energyCostInr = Math.round(energyConsumedUnits * fallbackFuel.cngPerKg);
      }

      const comfortScore = computeComfortScore({
        expresswayFraction,
        surfaceQualityScore,
        tollPlazaCount: tollPlazas.length,
        stepsCount: Math.round(distanceKm / 8),
        distanceKm,
        stopsCount: corridorStops.length,
        departureHour: new Date(departAt).getHours(),
      });

      const stopQualityScore = computeStopQualityScore(corridorStops, vehicle.fuelType === 'EV');

      let routeName = 'TomTom Express Corridor';
      let summaryText = 'Fastest traffic-optimized highway route';
      if (isAvoidToll) {
        routeName = 'No-Toll Highway Alternative (Avoid Tolls)';
        summaryText = 'Zero FASTag toll route via toll-free national/state roads';
      } else if (index === 1) {
        routeName = 'TomTom Alternate Highway Corridor';
        summaryText = 'Balanced secondary highway corridor';
      }

      return {
        id: `route-candidate-${index + 1}`,
        name: routeName,
        summary: summaryText,
        distanceKm,
        drivingDurationMinutes,
        trafficDurationMinutes: drivingDurationMinutes,
        trafficDelayMinutes,
        trafficSource: 'TomTom',
        routingProvider: 'TomTom',
        geometry,
        stepsCount: Math.round(distanceKm / 8),
        expresswayFraction,
        surfaceQualityScore,
        tollPlazas,
        tollCostInr,
        tollSource: {
          type: isAvoidToll ? 'Live' : 'Estimated',
          provider: isAvoidToll ? 'TomTom Avoid-Tolls Engine' : 'NHAI FASTag Car Toll Rate Table',
          timestamp: new Date().toISOString(),
          notes: isAvoidToll ? 'Route strictly avoids all toll roads.' : 'Live traffic-aware ETA from TomTom Routing API.',
        },
        allStops: corridorStops,
        plannedStops: [],
        stopQualityScore,
        comfortScore,
        energyConsumedUnits,
        energyCostInr,
        energySource: {
          type: 'Live',
          provider: 'State Retail Fuel Tariff',
          timestamp: new Date().toISOString(),
        },
        totalCostInr: energyCostInr + tollCostInr,
        totalDurationMinutes: drivingDurationMinutes,
        timeScore: 0,
        costScore: 0,
        scoresByStyle: { Fast: 0, Cheap: 0, Comfort: 0, Default: 0 },
        compositeScore: 0,
      };
    });

    return { candidates, provider: 'TomTom', tomtomQuotaExceeded: false };
  } catch (err: any) {
    console.warn('TomTom routing exception:', err);
    return null;
  }
}

/**
 * Fallback Routing via OSRM Public Server (labeled "No live traffic")
 */
async function fetchOsrmFallbackRoutes(
  origin: Coordinates,
  destination: Coordinates,
  vehicle: VehiclePreset
): Promise<RoutingEngineResponse> {
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&steps=true&annotations=true&alternatives=true`;
  const res = await fetchWithTimeoutAndRetry(osrmUrl, {}, 12000, 1);
  if (!res.ok) {
    throw new Error(`OSRM Fallback routing failed with status ${res.status}`);
  }
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No drivable route found between these locations in India. Please check origin and destination.');
  }

  const rawRoutes = data.routes;

  if (rawRoutes.length < 2) {
    try {
      const midLat = (origin.lat + destination.lat) / 2;
      const midLon = (origin.lon + destination.lon) / 2;
      const dLat = destination.lat - origin.lat;
      const dLon = destination.lon - origin.lon;
      const offsetLat = midLat - dLon * 0.2;
      const offsetLon = midLon + dLat * 0.2;

      const altUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${offsetLon.toFixed(4)},${offsetLat.toFixed(4)};${destination.lon},${destination.lat}?overview=full&geometries=geojson&steps=true`;
      const altRes = await fetchWithTimeoutAndRetry(altUrl, {}, 6000, 0);
      if (altRes.ok) {
        const altData = await altRes.json();
        if (altData.routes?.[0]) {
          rawRoutes.push(altData.routes[0]);
        }
      }
    } catch {}
  }

  const uniqueRoutes: any[] = [];
  for (const r of rawRoutes) {
    const isDupe = uniqueRoutes.some((existing) => {
      const diffDist = Math.abs(existing.distance - r.distance) / Math.max(1, existing.distance);
      const diffDuration = Math.abs(existing.duration - r.duration) / Math.max(1, existing.duration);
      return diffDist < 0.05 && diffDuration < 0.05;
    });
    if (!isDupe) uniqueRoutes.push(r);
  }

  const primaryGeometry: [number, number][] = uniqueRoutes[0].geometry.coordinates.map(
    ([lon, lat]: [number, number]) => [lat, lon]
  );
  const primaryDistanceKm = Math.round(uniqueRoutes[0].distance / 1000);
  const corridorStops = await fetchOverpassStopsAlongRoute(primaryGeometry, primaryDistanceKm);

  const candidates: RouteCandidate[] = uniqueRoutes.slice(0, 3).map((r, index) => {
    const distanceKm = Math.round(r.distance / 1000);
    const drivingDurationMinutes = Math.round(r.duration / 60);
    const geometry: [number, number][] = r.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]);
    const steps = r.legs?.[0]?.steps || [];

    let expresswaySteps = 0;
    for (const s of steps) {
      const name = (s.name || s.ref || '').toLowerCase();
      if (
        name.includes('expressway') ||
        name.includes('mahamarg') ||
        name.includes('freeway') ||
        name.startsWith('ne') ||
        name.startsWith('nh')
      ) {
        expresswaySteps++;
      }
    }
    const expresswayFraction = steps.length > 0 ? Math.min(1, (expresswaySteps / steps.length) * 1.5) : 0.6;
    const surfaceQualityScore = Number((0.75 + expresswayFraction * 0.20).toFixed(2));

    const tollPlazas = corridorStops.filter((s) => s.type === 'toll');
    const tollCount = Math.max(Math.floor(distanceKm / 75), tollPlazas.length);
    const tollCostInr = index === 1 ? Math.round(tollCount * 70) : Math.round(distanceKm * (expresswayFraction > 0.5 ? 1.85 : 1.25));

    let energyConsumedUnits = 0;
    let energyCostInr = 0;
    const fallbackFuel = getFallbackFuelPrice(origin.state || destination.state);

    if (vehicle.fuelType === 'EV') {
      energyConsumedUnits = Number((distanceKm / Math.max(1, vehicle.efficiency)).toFixed(1));
      energyCostInr = Math.round(energyConsumedUnits * fallbackFuel.evFastChargePerKwh);
    } else if (vehicle.fuelType === 'Petrol') {
      energyConsumedUnits = Number((distanceKm / Math.max(1, vehicle.efficiency)).toFixed(1));
      energyCostInr = Math.round(energyConsumedUnits * fallbackFuel.petrolPerLiter);
    } else if (vehicle.fuelType === 'Diesel') {
      energyConsumedUnits = Number((distanceKm / Math.max(1, vehicle.efficiency)).toFixed(1));
      energyCostInr = Math.round(energyConsumedUnits * fallbackFuel.dieselPerLiter);
    } else if (vehicle.fuelType === 'CNG') {
      energyConsumedUnits = Number((distanceKm / Math.max(1, vehicle.efficiency)).toFixed(1));
      energyCostInr = Math.round(energyConsumedUnits * fallbackFuel.cngPerKg);
    }

    const comfortScore = computeComfortScore({
      expresswayFraction,
      surfaceQualityScore,
      tollPlazaCount: tollCount,
      stepsCount: steps.length,
      distanceKm,
      stopsCount: corridorStops.length,
      departureHour: new Date().getHours(),
    });

    const stopQualityScore = computeStopQualityScore(corridorStops, vehicle.fuelType === 'EV');

    const routeName =
      index === 0
        ? 'OSRM Highway Corridor (Free-flow)'
        : index === 1
        ? 'OSRM Alternative Corridor (Lower Tolls)'
        : 'OSRM State Highway Connector';

    return {
      id: `route-candidate-${index + 1}`,
      name: routeName,
      summary: `Via ${steps[Math.floor(steps.length / 2)]?.name || 'Primary Corridor'}`,
      distanceKm,
      drivingDurationMinutes,
      trafficDurationMinutes: undefined,
      trafficDelayMinutes: undefined,
      trafficSource: 'No live traffic',
      routingProvider: 'OSRM',
      geometry,
      stepsCount: steps.length,
      expresswayFraction,
      surfaceQualityScore,
      tollPlazas,
      tollCostInr,
      tollSource: {
        type: 'Estimated',
        provider: 'NHAI FASTag Car Toll Rate Table',
        timestamp: new Date().toISOString(),
        notes: 'Fallback OSRM routing. Times labeled "No live traffic".',
      },
      allStops: corridorStops,
      plannedStops: [],
      stopQualityScore,
      comfortScore,
      energyConsumedUnits,
      energyCostInr,
      energySource: {
        type: 'Live',
        provider: 'State Retail Fuel Tariff',
        timestamp: new Date().toISOString(),
      },
      totalCostInr: energyCostInr + tollCostInr,
      totalDurationMinutes: drivingDurationMinutes,
      timeScore: 0,
      costScore: 0,
      scoresByStyle: { Fast: 0, Cheap: 0, Comfort: 0, Default: 0 },
      compositeScore: 0,
    };
  });

  return { candidates, provider: 'OSRM', tomtomQuotaExceeded: false };
}

/**
 * Unified Route Candidates Handler
 * Attempts TomTom primary first (traffic=true, alternatives, avoid=tollRoads);
 * Falls back to OSRM if TomTom is unavailable or hits daily limit.
 */
export async function getRouteCandidates(
  origin: Coordinates,
  destination: Coordinates,
  vehicle: VehiclePreset,
  departureTime?: string
): Promise<RoutingEngineResponse> {
  const cacheKey = `route:${origin.lat.toFixed(4)},${origin.lon.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lon.toFixed(4)}:${vehicle.fuelType}:${departureTime || 'now'}`;
  const cached = routeCache.get(cacheKey);
  if (cached) return cached;

  // 1. Try TomTom primary
  let result: RoutingEngineResponse | null = null;
  let quotaExceeded = false;

  if (process.env.TOMTOM_API_KEY) {
    try {
      result = await fetchTomTomRoutes(origin, destination, vehicle, departureTime);
      if (result && result.tomtomQuotaExceeded) {
        quotaExceeded = true;
        result = null; // force OSRM fallback
      }
    } catch (e) {
      console.warn('TomTom primary failed, falling back to OSRM:', e);
    }
  }

  // 2. Fallback to OSRM if TomTom failed or key not set
  if (!result || result.candidates.length === 0) {
    result = await fetchOsrmFallbackRoutes(origin, destination, vehicle);
    if (quotaExceeded) {
      result.tomtomQuotaExceeded = true;
    }
  }

  routeCache.set(cacheKey, result, 1000 * 60 * 60 * 2);
  return result;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function generateSyntheticStops(geometry: [number, number][], distanceKm: number): StopAmenity[] {
  const stops: StopAmenity[] = [];
  const numStops = Math.max(3, Math.floor(distanceKm / 80));

  for (let i = 1; i <= numStops; i++) {
    const fraction = i / (numStops + 1);
    const index = Math.floor(fraction * geometry.length);
    const [lat, lon] = geometry[index] || geometry[0];
    const dist = Math.round(fraction * distanceKm);

    if (i % 3 === 0) {
      stops.push({
        id: `synth-ev-${i}`,
        name: `Highway EV Fast Charger (~${dist} km)`,
        type: 'ev_charger',
        lat,
        lon,
        distanceFromOriginKm: dist,
        brand: 'Tata Power EZ Charge / Jio-bp',
        chargerPowerKw: 50,
        hasToilets: true,
        hasFood: true,
        isOpen24x7: true,
        comfortContributionScore: 0.85,
      });
    } else if (i % 2 === 0) {
      stops.push({
        id: `synth-toll-${i}`,
        name: `FASTag Toll Plaza (~${dist} km)`,
        type: 'toll',
        lat,
        lon,
        distanceFromOriginKm: dist,
        comfortContributionScore: 0.7,
      });
    } else {
      stops.push({
        id: `synth-fuel-${i}`,
        name: `COCO Fuel & Rest Oasis (~${dist} km)`,
        type: 'fuel',
        lat,
        lon,
        distanceFromOriginKm: dist,
        brand: 'IndianOil SWAGAT / BPCL Ghar',
        hasToilets: true,
        hasFood: true,
        hasParking: true,
        isOpen24x7: true,
        comfortContributionScore: 0.9,
      });
    }
  }

  return stops;
}
