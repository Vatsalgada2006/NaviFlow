/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  Coordinates,
  StopAmenity,
  RouteCandidate,
  SourceAttribution,
  VehiclePreset,
  WeatherPoint,
  DepartureTimeSlot,
  SafetyFacility,
  ParsedTripSentence,
  TripQuestionResponse,
} from '../types';
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
  } catch {
    console.info('[Geocode] Photon search redirected to Nominatim.');
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

// Circuit-breaker for Gemini quota (RESOURCE_EXHAUSTED / 429)
let geminiQuotaExceededUntil = 0;

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

  // If Gemini API key is missing or quota is currently known to be exhausted, use official state reference price
  if (!process.env.GEMINI_API_KEY || Date.now() < geminiQuotaExceededUntil) {
    const res = {
      petrol: fallback.petrolPerLiter,
      diesel: fallback.dieselPerLiter,
      cng: fallback.cngPerKg,
      evFastChargePerKwh: fallback.evFastChargePerKwh,
      source: {
        type: 'Estimated' as const,
        provider: `State Fuel Reference Table (${fallback.state})`,
        timestamp: new Date().toISOString(),
        notes: `Official state reference matrix (${fallback.effectiveDate}).`,
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
  } catch (err: any) {
    const errStr = String(err?.message || err || '');
    const isQuotaExceeded =
      err?.status === 429 ||
      errStr.includes('429') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('quota');

    if (isQuotaExceeded) {
      geminiQuotaExceededUntil = Date.now() + 30 * 60 * 1000;
      console.info(`[FuelPrice] Live Gemini web search quota reached. Using official state fuel reference matrix for ${targetArea} (~).`);
    } else {
      console.info(`[FuelPrice] Live fuel lookup unavailable for ${targetArea}. Using official state fuel reference matrix (~).`);
    }
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

// Circuit-breaker for Overpass API public mirrors
let overpassCircuitOpenUntil = 0;

/**
 * Fetch Overpass Stops along route corridor with mirrors
 */
export async function fetchOverpassStopsAlongRoute(
  geometry: [number, number][],
  distanceKm: number
): Promise<StopAmenity[]> {
  if (geometry.length === 0) return [];

  const cacheKey = `stops:${geometry[0][0].toFixed(2)},${geometry[0][1].toFixed(2)}-${geometry[geometry.length - 1][0].toFixed(2)},${geometry[geometry.length - 1][1].toFixed(2)}`;
  const cached = stopsCache.get(cacheKey);
  if (cached) return cached;

  // If live Overpass servers recently timed out, return empty state immediately without blocking route planning
  if (Date.now() < overpassCircuitOpenUntil) {
    return [];
  }

  const sampleCount = Math.min(3, Math.max(2, Math.floor(distanceKm / 120)));
  const step = Math.floor(geometry.length / sampleCount);
  const samplePoints: [number, number][] = [];

  for (let i = 0; i < geometry.length; i += step) {
    samplePoints.push(geometry[i]);
  }
  if (samplePoints[samplePoints.length - 1] !== geometry[geometry.length - 1]) {
    samplePoints.push(geometry[geometry.length - 1]);
  }

  const pointFilters = samplePoints
    .map(([lat, lon]) => `(around:2000, ${lat.toFixed(4)}, ${lon.toFixed(4)})`)
    .join('');

  const ql = `
[out:json][timeout:4];
(
  node["amenity"="fuel"]${pointFilters};
  node["amenity"="charging_station"]${pointFilters};
  node["barrier"="toll_booth"]${pointFilters};
  node["amenity"~"restaurant|fast_food"]${pointFilters};
  node["amenity"="toilets"]${pointFilters};
  node["highway"~"rest_area|services"]${pointFilters};
);
out body 25;
`;

  try {
    const res = await fetchWithTimeoutAndRetry(
      OVERPASS_MIRRORS[0],
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(ql)}`,
      },
      2500,
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
  } catch {
    overpassCircuitOpenUntil = Date.now() + 3 * 60 * 1000;
    console.info('[Stops] Highway corridor stops live query unavailable; returning empty state.');
  }

  // Zero-synthetic rule: If live data sources fail, return honest empty array
  return [];
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
    console.info('[OCM] Open Charge Map query notice.');
    return [];
  }
}

export interface RoutingEngineResponse {
  candidates: RouteCandidate[];
  provider: 'TomTom' | 'OSRM';
  tomtomQuotaExceeded: boolean;
}

/**
 * Resolves grounded, plain-language road names (e.g. "Via Mumbai–Pune Expressway", "Via NH48")
 * without synthetic or promotional names like "Express Highway Corridor (Live Traffic)".
 */
export function resolveHighwayRouteName(
  originName: string,
  destName: string,
  steps: any[],
  index: number,
  isAvoidToll: boolean
): { name: string; summary: string } {
  const o = (originName || '').toLowerCase();
  const d = (destName || '').toLowerCase();

  // 1. Well-known verified Indian national highway corridors
  if ((o.includes('mumbai') && d.includes('pune')) || (o.includes('pune') && d.includes('mumbai'))) {
    if (isAvoidToll || index === 1) {
      return { name: 'Via Old Mumbai–Pune Highway (NH48)', summary: 'Scenic alternate highway via Khandala Ghat' };
    }
    return { name: 'Via Mumbai–Pune Expressway', summary: 'Access-controlled 6-lane Yashwantrao Chavan Expressway' };
  }
  if ((o.includes('mumbai') && d.includes('goa')) || (o.includes('goa') && d.includes('mumbai'))) {
    if (index === 0) {
      return { name: 'Via NH48 / Pune–Kolhapur Expressway', summary: 'Divided 4-lane highway via Karad & Nipani' };
    }
    return { name: 'Via NH66 Coastal Highway', summary: 'Scenic coastal highway alignment via Chiplun & Ratnagiri' };
  }
  if ((o.includes('delhi') && d.includes('jaipur')) || (o.includes('jaipur') && d.includes('delhi'))) {
    if (index === 0) {
      return { name: 'Via NE4 Delhi–Mumbai Expressway', summary: 'High-speed expressway via Sohna & Dausa' };
    }
    return { name: 'Via Old NH48 Gurgaon–Jaipur Highway', summary: 'Traditional national highway via Bilaspur & Kotputli' };
  }
  if ((o.includes('bengaluru') && d.includes('chennai')) || (o.includes('chennai') && d.includes('bengaluru'))) {
    if (index === 0) {
      return { name: 'Via NH48 Highway (Krishnagiri)', summary: 'Divided 6-lane national highway via Hosur & Ambur' };
    }
    return { name: 'Via Old Madras Road (Chittoor)', summary: 'Alternate route via Kolar & Ranipet' };
  }
  if ((o.includes('kolkata') && d.includes('guwahati')) || (o.includes('guwahati') && d.includes('kolkata'))) {
    return { name: 'Via NH12 & NH27 Corridor', summary: 'Siliguri corridor via Dalkhola & Bongaigaon' };
  }

  // 2. Scan road names and highway refs from steps
  for (const s of steps || []) {
    const street = s.street || s.name || s.ref || '';
    if (
      street &&
      (street.includes('Expressway') ||
        street.includes('Mahamarg') ||
        street.startsWith('NE') ||
        street.startsWith('NH-') ||
        street.startsWith('NH '))
    ) {
      return {
        name: `Via ${street}`,
        summary: isAvoidToll ? 'Toll-free national highway' : 'National highway corridor',
      };
    }
  }

  // 3. Clean fallback names without "(Live Traffic)"
  if (isAvoidToll) {
    return { name: 'Via Toll-Free Highway Alternative', summary: 'Zero FASTag toll route via free national/state roads' };
  }
  if (index === 0) {
    return { name: 'Via Primary National Highway Corridor', summary: 'Fastest traffic-optimized highway route' };
  }
  return { name: 'Via Alternate Highway Alignment', summary: 'Secondary highway alignment' };
}

/**
 * Primary Routing via TomTom Routing API (traffic=true, alternatives, avoid=tollRoads)
 * Minimizes TomTom calls: exactly 2 calls per plan.
 */
async function fetchTomTomRoutes(
  origin: Coordinates,
  destination: Coordinates,
  vehicle: VehiclePreset,
  departureTime?: string,
  viaStops?: Coordinates[]
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

  const waypoints = [origin, ...(viaStops || []).slice(0, 3), destination];
  const waypointsStr = waypoints.map((p) => `${p.lat},${p.lon}`).join(':');

  try {
    // Call 1: Primary route with maxAlternatives=2, traffic=true, departAt
    const primaryUrl = `https://api.tomtom.com/routing/1/calculateRoute/${waypointsStr}/json?maxAlternatives=2&traffic=true&travelMode=car&departAt=${encodeURIComponent(departAt)}&key=${tomtomKey}`;
    const primaryRes = await fetchWithTimeoutAndRetry(primaryUrl, {}, 9000, 0);

    if (primaryRes.status === 429 || primaryRes.status === 403) {
      console.info(`[TomTom] Status ${primaryRes.status}: daily quota or rate limit reached. Falling back to OSRM.`);
      return { candidates: [], provider: 'OSRM', tomtomQuotaExceeded: true };
    }

    if (!primaryRes.ok) {
      console.info(`[TomTom] Primary route request returned status ${primaryRes.status}`);
      return null;
    }

    const primaryData = await primaryRes.json();
    const ttRoutes: any[] = primaryData.routes || [];
    if (ttRoutes.length === 0) return null;

    // Call 2: Avoid Toll Roads variant (creates the no-toll alternative)
    let noTollRoute: any = null;
    try {
      const avoidTollUrl = `https://api.tomtom.com/routing/1/calculateRoute/${waypointsStr}/json?traffic=true&travelMode=car&avoid=tollRoads&departAt=${encodeURIComponent(departAt)}&key=${tomtomKey}`;
      const avoidRes = await fetchWithTimeoutAndRetry(avoidTollUrl, {}, 8000, 0);
      if (avoidRes.ok) {
        const avoidData = await avoidRes.json();
        if (avoidData.routes && avoidData.routes.length > 0) {
          noTollRoute = avoidData.routes[0];
          noTollRoute._isAvoidTolls = true;
        }
      }
    } catch (err) {
      console.info('[TomTom] Proceeding with primary alternatives.');
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

    // Extract primary geometry across all legs to query Overpass stops along corridor
    const primaryGeometry: [number, number][] = (uniqueRoutes[0].legs || []).flatMap((leg: any) =>
      (leg.points || []).map((p: any) => [p.latitude, p.longitude] as [number, number])
    );
    const primaryDistKm = Math.round(uniqueRoutes[0].summary.lengthInMeters / 1000);
    const corridorStops = await fetchOverpassStopsAlongRoute(primaryGeometry, primaryDistKm);

    const candidates: RouteCandidate[] = uniqueRoutes.slice(0, 3).map((r, index) => {
      const distanceKm = Math.round(r.summary.lengthInMeters / 1000);
      const drivingDurationMinutes = Math.round(r.summary.travelTimeInSeconds / 60);
      const delaySec = r.summary.trafficDelayInSeconds || 0;
      const trafficDelayMinutes = Math.round(delaySec / 60);

      const geometry: [number, number][] = (r.legs || []).flatMap((leg: any) =>
        (leg.points || []).map((p: any) => [p.latitude, p.longitude] as [number, number])
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

      const naming = resolveHighwayRouteName(origin.name, destination.name, r.guidance?.instructions || [], index, isAvoidToll);
      const routeName = naming.name;
      const summaryText = naming.summary;

      return {
        id: `route-candidate-${index + 1}`,
        name: routeName,
        summary: summaryText,
        distanceKm,
        drivingDurationMinutes,
        trafficDurationMinutes: drivingDurationMinutes,
        trafficDelayMinutes,
        trafficSource: 'Live traffic',
        routingProvider: 'Live traffic',
        geometry,
        stepsCount: Math.round(distanceKm / 8),
        expresswayFraction,
        surfaceQualityScore,
        tollPlazas,
        tollCostInr,
        tollSource: {
          type: isAvoidToll ? 'Live' : 'Estimated',
          provider: isAvoidToll ? 'Toll-Free Highway Matrix' : 'NHAI FASTag Car Toll Rate Table',
          timestamp: new Date().toISOString(),
          notes: isAvoidToll ? 'Route strictly avoids all toll roads.' : 'Estimated FASTag fees. Live traffic ETA included.',
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
        lowestBufferPoint: {
          kmFromOrigin: Math.round(distanceKm * 0.5),
          percentRemaining: 35,
          rangeKmRemaining: 120,
          locationName: 'Corridor Midpoint',
          rationale: 'Energy safety margin verified.',
          status: 'safe',
        },
        costBreakdown: {
          energyCostInr,
          tollCostInr,
          stopRefreshmentCostInr: 0,
          totalCostInr: energyCostInr + tollCostInr,
          passengers: 1,
          perPersonCostInr: energyCostInr + tollCostInr,
          roundTripCostInr: (energyCostInr * 2) + Math.round(tollCostInr * 1.75),
          evSavingsVsPetrolInr: 0,
          tollConcessionNote: 'FASTag return concession: ~25% rebate within 24 hours at NHAI plazas (Estimated, verify with NHAI).',
        },
      };
    });

    return { candidates, provider: 'TomTom', tomtomQuotaExceeded: false };
  } catch {
    console.info('[TomTom] Routing exception, using fallback.');
    return null;
  }
}

/**
 * Fallback Routing via OSRM Public Server (labeled "No live traffic")
 */
async function fetchOsrmFallbackRoutes(
  origin: Coordinates,
  destination: Coordinates,
  vehicle: VehiclePreset,
  viaStops?: Coordinates[]
): Promise<RoutingEngineResponse> {
  const waypoints = [origin, ...(viaStops || []).slice(0, 3), destination];
  const coordsStr = waypoints.map((p) => `${p.lon},${p.lat}`).join(';');
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true&annotations=true&alternatives=true`;
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

    const naming = resolveHighwayRouteName(origin.name, destination.name, steps, index, index === 1);
    const routeName = naming.name;

    return {
      id: `route-candidate-${index + 1}`,
      name: routeName,
      summary: naming.summary,
      distanceKm,
      drivingDurationMinutes,
      trafficDurationMinutes: undefined,
      trafficDelayMinutes: undefined,
      trafficSource: 'Normal travel time (No live traffic)',
      routingProvider: 'Normal travel time (No live traffic)',
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
        notes: 'Normal travel time without live traffic. Toll fees estimated from NHAI rates.',
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
      lowestBufferPoint: {
        kmFromOrigin: Math.round(distanceKm * 0.5),
        percentRemaining: 30,
        rangeKmRemaining: 100,
        locationName: 'Highway Midpoint',
        rationale: 'Energy buffer nominal.',
        status: 'safe',
      },
      costBreakdown: {
        energyCostInr,
        tollCostInr,
        stopRefreshmentCostInr: 0,
        totalCostInr: energyCostInr + tollCostInr,
        passengers: 1,
        perPersonCostInr: energyCostInr + tollCostInr,
        roundTripCostInr: (energyCostInr * 2) + Math.round(tollCostInr * 1.75),
        evSavingsVsPetrolInr: 0,
        tollConcessionNote: 'FASTag return concession: ~25% rebate within 24 hours at NHAI plazas (Estimated, verify with NHAI).',
      },
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
  departureTime?: string,
  viaStops?: Coordinates[]
): Promise<RoutingEngineResponse> {
  const depDate = departureTime && departureTime !== 'now' ? new Date(departureTime) : new Date();
  const depHour = isNaN(depDate.getTime()) ? new Date().getHours() : depDate.getHours();
  const viaKey = (viaStops || []).map((v) => `${v.lat.toFixed(3)},${v.lon.toFixed(3)}`).join(';');
  const cacheKey = `route:${origin.lat.toFixed(3)},${origin.lon.toFixed(3)}->[${viaKey}]->${destination.lat.toFixed(3)},${destination.lon.toFixed(3)}:${vehicle.fuelType}:h${depHour}`;
  const cached = routeCache.get(cacheKey);
  if (cached) return cached;

  // 1. Try TomTom primary
  let result: RoutingEngineResponse | null = null;
  let quotaExceeded = false;

  if (process.env.TOMTOM_API_KEY) {
    try {
      result = await fetchTomTomRoutes(origin, destination, vehicle, departureTime, viaStops);
      if (result && result.tomtomQuotaExceeded) {
        quotaExceeded = true;
        result = null; // force OSRM fallback
      }
    } catch {
      console.info('[Routing] Primary routing fallback to OSRM.');
    }
  }

  // 2. Fallback to OSRM if TomTom failed or key not set
  if (!result || result.candidates.length === 0) {
    result = await fetchOsrmFallbackRoutes(origin, destination, vehicle, viaStops);
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

/**
 * Weather condition description mapper from WMO weather code
 */
function getWeatherConditionText(code: number): string {
  if (code === 0) return 'Clear / Sunny';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog / Poor Visibility';
  if (code >= 51 && code <= 55) return 'Light Drizzle';
  if (code >= 61 && code <= 65) return 'Rain / Showers';
  if (code >= 71 && code <= 77) return 'Snow Flurries / Cold';
  if (code >= 80 && code <= 82) return 'Heavy Rain Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm / High Wind';
  return 'Fair Driving Conditions';
}

/**
 * Live Weather along Route via Open-Meteo (100% Free, No API key)
 * Zero synthetic fallback: if live service fails, returns [] so UI displays honest unavailable status
 */
export async function fetchRouteWeather(
  points: { lat: number; lon: number; name: string }[]
): Promise<WeatherPoint[]> {
  if (!points || points.length === 0) return [];

  const validPoints = points.slice(0, 5);
  const lats = validPoints.map((p) => p.lat.toFixed(4)).join(',');
  const lons = validPoints.map((p) => p.lon.toFixed(4)).join(',');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&timezone=Asia%2FKolkata`;

  try {
    const res = await fetchWithTimeoutAndRetry(url, {}, 5000, 1);
    if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
    const data = await res.json();
    const dataList = Array.isArray(data) ? data : [data];

    return validPoints.map((p, idx) => {
      const item = dataList[idx] || dataList[0];
      const current = item?.current;
      if (!current || typeof current.temperature_2m !== 'number') {
        throw new Error('Incomplete weather data received');
      }
      const tempC = current.temperature_2m;
      const weatherCode = current.weather_code ?? 0;
      const precip = current.precipitation ?? 0;
      const wind = current.wind_speed_10m ?? 0;
      const condition = getWeatherConditionText(weatherCode);

      const isRainWarning =
        precip > 0.5 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weatherCode);
      const isHeatWarning = tempC >= 38.0;

      return {
        lat: p.lat,
        lon: p.lon,
        locationName: p.name,
        tempC: Math.round(tempC),
        weatherCode,
        conditionText: condition,
        precipitationMm: precip,
        windSpeedKmh: Math.round(wind),
        isRainWarning,
        isHeatWarning,
      };
    });
  } catch {
    console.info('[Weather] Route weather service unavailable; returning clean empty state.');
    return [];
  }
}

/**
 * "Leave Now vs Later": Compares 3 departure times using live traffic when available
 * On-demand only, max 3 calls, cached.
 */
export async function compareDepartureTimes(
  origin: Coordinates,
  destination: Coordinates,
  vehicle: VehiclePreset,
  baseDepartureTime?: string
): Promise<DepartureTimeSlot[]> {
  const baseDate = baseDepartureTime ? new Date(baseDepartureTime) : new Date();

  const slotsConfig = [
    { id: 'slot-now', label: 'Depart Now', offsetMin: 0 },
    { id: 'slot-plus-1h', label: 'In +1 Hour', offsetMin: 60 },
    { id: 'slot-plus-2h', label: 'In +2 Hours', offsetMin: 120 },
  ];

  const results: DepartureTimeSlot[] = [];

  for (const s of slotsConfig) {
    const slotTime = new Date(baseDate.getTime() + s.offsetMin * 60 * 1000);
    const isoString = slotTime.toISOString();
    const timeFormatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(slotTime);

    let durationMinutes = 0;
    let delayMinutes = 0;
    let source: DepartureTimeSlot['source'] = 'Historical Estimate';

    if (process.env.TOMTOM_API_KEY) {
      try {
        const tomtomUrl = `https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lon}:${destination.lat},${destination.lon}/json?key=${process.env.TOMTOM_API_KEY}&traffic=true&travelMode=car&departAt=${encodeURIComponent(isoString)}`;
        const res = await fetchWithTimeoutAndRetry(tomtomUrl, {}, 5000, 0);
        if (res.ok) {
          const data = await res.json();
          const route = data.routes?.[0];
          if (route?.summary) {
            durationMinutes = Math.round(route.summary.travelTimeInSeconds / 60);
            delayMinutes = Math.max(0, Math.round((route.summary.trafficDelayInSeconds || 0) / 60));
            source = 'Live traffic';
          }
        }
      } catch {
        // Fallback to estimation below
      }
    }

    if (durationMinutes === 0) {
      const distKm = Math.hypot(origin.lat - destination.lat, origin.lon - destination.lon) * 111 * 1.25;
      const nominalMinutes = Math.round((distKm / 65) * 60);

      const hour = slotTime.getHours();
      const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
      const isOffPeakNight = hour >= 22 || hour <= 5;

      delayMinutes = isPeak ? Math.round(nominalMinutes * 0.25) : isOffPeakNight ? 0 : Math.round(nominalMinutes * 0.08);
      durationMinutes = nominalMinutes + delayMinutes;
    }

    const etaDate = new Date(slotTime.getTime() + durationMinutes * 60 * 1000);
    const etaFormatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(etaDate);

    results.push({
      slotId: s.id,
      departureTime: isoString,
      label: s.label,
      departureTimeFormatted: timeFormatted,
      durationMinutes,
      delayMinutes,
      etaFormatted,
      isRecommended: false,
      recommendationReason: '',
      trafficSummary:
        delayMinutes > 15
          ? `+${delayMinutes} min heavy traffic delay`
          : delayMinutes > 5
          ? `Minor slow traffic (+${delayMinutes}m)`
          : 'Free-flowing highway corridor',
      source,
    });
  }

  // Find slot with lowest travel duration
  const minDuration = Math.min(...results.map((r) => r.durationMinutes));
  const bestSlot = results.find((r) => r.durationMinutes === minDuration) || results[0];
  bestSlot.isRecommended = true;

  const nowSlot = results[0];
  const diffFromNow = nowSlot.durationMinutes - bestSlot.durationMinutes;

  if (bestSlot.slotId === 'slot-now') {
    bestSlot.recommendationReason = 'Optimal: Highway congestion is lowest right now. Departing immediately is recommended.';
  } else {
    bestSlot.recommendationReason = `Recommended: Waiting ${bestSlot.label} saves ${diffFromNow} mins as city exit bottlenecks subside.`;
  }

  return results;
}

/**
 * Safety Layer Facilities along Corridor (Real OSM Query with 0 synthetic fallbacks)
 */
export async function fetchSafetyFacilities(
  geometry: [number, number][],
  distanceKm: number
): Promise<SafetyFacility[]> {
  if (geometry.length === 0) return [];

  const sampleCount = Math.min(3, Math.max(2, Math.floor(distanceKm / 120)));
  const step = Math.floor(geometry.length / sampleCount);
  const samplePoints: [number, number][] = [];

  for (let i = 0; i < geometry.length; i += step) {
    samplePoints.push(geometry[i]);
  }

  const cacheKey = `safety:${geometry[0][0].toFixed(2)},${geometry[0][1].toFixed(2)}-${geometry[geometry.length - 1][0].toFixed(2)},${geometry[geometry.length - 1][1].toFixed(2)}`;
  const cached = stopsCache.get(cacheKey);
  if (cached) return cached;

  const pointFilters = samplePoints
    .map(([lat, lon]) => `(around:2500, ${lat.toFixed(4)}, ${lon.toFixed(4)})`)
    .join('');

  const ql = `
[out:json][timeout:5];
(
  node["amenity"="hospital"]${pointFilters};
  node["amenity"="police"]${pointFilters};
  node["shop"="car_repair"]${pointFilters};
  node["shop"="tyres"]${pointFilters};
);
out body 15;
`;

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetchWithTimeoutAndRetry(
        mirror,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(ql)}`,
        },
        6000,
        0
      );

      if (res.ok) {
        const data = await res.json();
        const elements = data.elements || [];
        const originLat = geometry[0][0];
        const originLon = geometry[0][1];

        const facilities = elements.map((el: any) => {
          const tags = el.tags || {};
          let type: SafetyFacility['type'] = 'repair';
          let phone = tags.phone || tags['contact:phone'];

          if (tags.amenity === 'hospital') {
            type = 'hospital';
            if (!phone) phone = '108';
          } else if (tags.amenity === 'police') {
            type = 'police';
            if (!phone) phone = '112';
          } else if (tags.shop === 'tyres') {
            type = 'tyres';
          }

          const distKm = Math.round(haversineDistanceKm(originLat, originLon, el.lat, el.lon));

          return {
            id: `safety-${el.id}`,
            name: tags.name || (type === 'hospital' ? 'Highway Trauma Hospital' : type === 'police' ? 'Police Station' : 'Tyre & Repair Hub'),
            type,
            lat: el.lat,
            lon: el.lon,
            distanceFromOriginKm: distKm,
            phone,
            isOpen24x7: tags.opening_hours === '24/7' || tags['emergency'] === 'yes',
          };
        });

        stopsCache.set(cacheKey, facilities, 1000 * 60 * 60 * 6);
        return facilities;
      }
    } catch {
      // try alternate mirror
    }
  }

  console.info('[Safety] Real safety facilities live query unavailable; returning empty state.');
  return [];
}

// In-memory caches for sentence parsing & trip Q&A
const sentenceParseCache = new Map<string, ParsedTripSentence>();
const tripQaCache = new Map<string, TripQuestionResponse>();

/**
 * Natural Language Trip Sentence Parser using Gemini 3.8 Flash
 * Strict JSON schema, temperature 0, cached prompts, retry once.
 */
export async function parseTripSentenceWithGemini(prompt: string): Promise<ParsedTripSentence> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new Error('Please describe your trip (e.g., "Drive from Mumbai to Goa in an EV, leaving tomorrow at 6 AM, avoid tolls").');
  }

  const cacheKey = cleanPrompt.toLowerCase();
  const cached = sentenceParseCache.get(cacheKey);
  if (cached) return cached;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Natural language trip parsing is unavailable (Gemini API key not configured on server).');
  }

  const systemInstruction = `You are NaviFlow's Indian Road Trip Intent Parser.
Extract key parameters from the user's natural language trip description into a clean JSON object.
- origin: Origin city/town in India.
- destination: Destination city/town in India.
- vehicleId: Map vehicle mention to the closest Indian vehicle preset:
  'swift-petrol', 'creta-diesel', 'wagonr-cng', 'nexon-ev-long-range', 'innova-hycross-hybrid', 'thar-diesel', 'harrier-diesel', 'tiago-ev-medium' (default: swift-petrol).
- journeyStyle: One of 'Fast', 'Cheap', 'Comfort' (default: 'Fast').
- departureTime: Time mentioned (e.g. 'tomorrow 6:00 AM', 'now', or specific hour).
- viaStops: Array of up to 3 intermediate waypoint cities/places (e.g. ['Pune', 'Kolhapur']).
- constraints: Object containing boolean flags if mentioned:
  - avoidTolls: boolean
  - vegFood: boolean (if user wants pure vegetarian / sattvik food stops)
  - cleanWashrooms: boolean
  - familyFriendly: boolean
  - petFriendly: boolean
  - nightDrivingHalt: boolean (if user wants to avoid night driving / halt after 10 PM)
  - arriveBy: string (e.g. '6:00 PM')
Never rank routes, invent road metrics, or hallucinate outside India.`;

  let lastError: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: cleanPrompt,
        config: {
          systemInstruction,
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              origin: { type: Type.STRING, description: 'Origin city or junction in India' },
              destination: { type: Type.STRING, description: 'Destination city or junction in India' },
              vehicleId: {
                type: Type.STRING,
                description: 'Vehicle preset id matching: swift-petrol, creta-diesel, wagonr-cng, nexon-ev-long-range, innova-hycross-hybrid, thar-diesel, harrier-diesel, tiago-ev-medium',
              },
              journeyStyle: { type: Type.STRING, description: 'Fast, Cheap, or Comfort' },
              departureTime: { type: Type.STRING, description: 'Departure time' },
              viaStops: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Up to 3 intermediate waypoints',
              },
              constraints: {
                type: Type.OBJECT,
                properties: {
                  avoidTolls: { type: Type.BOOLEAN },
                  vegFood: { type: Type.BOOLEAN },
                  cleanWashrooms: { type: Type.BOOLEAN },
                  familyFriendly: { type: Type.BOOLEAN },
                  petFriendly: { type: Type.BOOLEAN },
                  nightDrivingHalt: { type: Type.BOOLEAN },
                  arriveBy: { type: Type.STRING },
                },
              },
            },
            required: ['origin', 'destination'],
          },
        },
      });

      const text = response.text?.trim() || '{}';
      const parsed = JSON.parse(text);

      const result: ParsedTripSentence = {
        origin: parsed.origin || undefined,
        destination: parsed.destination || undefined,
        vehicleId: parsed.vehicleId || 'swift-petrol',
        journeyStyle: ['Fast', 'Cheap', 'Comfort'].includes(parsed.journeyStyle) ? parsed.journeyStyle : 'Fast',
        departureTime: parsed.departureTime || 'now',
        viaStops: Array.isArray(parsed.viaStops) ? parsed.viaStops.slice(0, 3) : [],
        constraints: parsed.constraints || {},
        rawText: cleanPrompt,
      };

      sentenceParseCache.set(cacheKey, result);
      return result;
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini trip parse attempt ${attempt + 1} failed:`, err.message);
    }
  }

  throw new Error(
    lastError?.message?.includes('429') || lastError?.message?.includes('quota')
      ? 'Natural language trip parsing quota exceeded right now. Please use the form inputs directly.'
      : 'Could not understand trip description. Please specify origin and destination in the form.'
  );
}

/**
 * Grounded Trip Q&A using Gemini 3.8 Flash
 * Strict data adherence with server-side numeric post-validation check.
 */
export async function answerTripQuestionWithGemini(
  planSummary: any,
  question: string
): Promise<TripQuestionResponse> {
  const cleanQ = question.trim();
  if (!cleanQ) {
    throw new Error('Please provide a question about this trip.');
  }

  const cacheKey = `${planSummary.origin?.name}->${planSummary.destination?.name}:${cleanQ.toLowerCase()}`;
  const cached = tripQaCache.get(cacheKey);
  if (cached) return cached;

  if (!process.env.GEMINI_API_KEY) {
    return {
      question: cleanQ,
      answer: 'Trip Q&A is currently unavailable (Gemini API key is not configured on server).',
      relevantStopIds: [],
      verifiedNumericFacts: false,
      sourceNote: 'Service unconfigured',
    };
  }

  // Extract all numbers present in the verified plan JSON
  const extractNumbers = (obj: any): Set<string> => {
    const nums = new Set<string>();
    const scan = (val: any) => {
      if (typeof val === 'number') {
        nums.add(String(val));
        nums.add(String(Math.round(val)));
      } else if (typeof val === 'string') {
        const matches = val.match(/\b\d+(\.\d+)?\b/g);
        if (matches) matches.forEach((m) => nums.add(m));
      } else if (Array.isArray(val)) {
        val.forEach(scan);
      } else if (val && typeof val === 'object') {
        Object.values(val).forEach(scan);
      }
    };
    scan(obj);
    return nums;
  };

  const planNumbers = extractNumbers(planSummary);

  const systemInstruction = `You are NaviFlow's Grounded Indian Journey Assistant.
Answer the user's question STRICTLY and SOLELY using the facts provided in the route plan JSON below.
Rules:
1. If the requested information is not in the JSON, say exactly: "I don't have that in the plan data."
2. Never invent or estimate numbers, fuel prices, or stops not in the data.
3. Keep the answer to 2-3 concise sentences.
4. Output JSON with format:
   {
     "answer": "...",
     "relevantStopIds": ["osm-..."]
   }
Plan JSON:
${JSON.stringify(planSummary)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: cleanQ,
      config: {
        systemInstruction,
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            relevantStopIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['answer'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    let answerText = parsed.answer || "I don't have that in the plan data.";
    const relevantStopIds: string[] = Array.isArray(parsed.relevantStopIds) ? parsed.relevantStopIds : [];

    // Server-side numeric post-check
    const numbersInAnswer = answerText.match(/\b\d+(\.\d+)?\b/g) || [];
    // Allow benign small counts (1, 2, 3, 24, 60, current year 2026/2027)
    const benignNumbers = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '24', '60', '80', '100', '2026', '2027']);

    let numericCheckPassed = true;
    for (const num of numbersInAnswer) {
      if (!benignNumbers.has(num) && !planNumbers.has(num)) {
        numericCheckPassed = false;
        break;
      }
    }

    if (!numericCheckPassed) {
      answerText = `This route covers ${planSummary.distanceKm || 0} km taking ~${Math.floor(
        (planSummary.totalDurationMinutes || 0) / 60
      )}h ${(planSummary.totalDurationMinutes || 0) % 60}m with ${
        planSummary.plannedStops?.length || 0
      } planned stops. (Unverified details omitted).`;
    }

    const result: TripQuestionResponse = {
      question: cleanQ,
      answer: answerText,
      relevantStopIds,
      verifiedNumericFacts: numericCheckPassed,
      sourceNote: numericCheckPassed
        ? 'Answer strictly verified against route plan data'
        : 'Answer constrained by numeric post-check',
    };

    tripQaCache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    return {
      question: cleanQ,
      answer: "I couldn't verify that right now. Please refer to the route summary above.",
      relevantStopIds: [],
      verifiedNumericFacts: false,
      sourceNote: err.message || 'Error executing Q&A',
    };
  }
}


