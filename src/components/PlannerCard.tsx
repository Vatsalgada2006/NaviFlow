/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  ArrowUpDown,
  Navigation2,
  Car,
  Fuel,
  Zap,
  Gauge,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Users,
  UtensilsCrossed,
  Sparkle,
  ShieldAlert,
  Dog,
  Compass,
} from 'lucide-react';
import {
  Coordinates,
  JourneyStyle,
  VehicleFuelType,
  VehiclePreset,
  RefineOptions,
} from '../types';
import { INDIAN_VEHICLE_PRESETS, DEFAULT_VEHICLE } from '../engine/vehicles';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface Props {
  onPlan: (params: {
    origin: Coordinates;
    destination: Coordinates;
    vehicle: VehiclePreset;
    journeyStyle: JourneyStyle;
    departureTime: string;
    refineOptions?: RefineOptions;
  }) => Promise<void>;
  isLoading: boolean;
  initialOrigin?: Coordinates | null;
  initialDestination?: Coordinates | null;
  lang: Language;
}

// Quick-start popular road trip corridors with exact verified highway coordinates in India
export const POPULAR_CORRIDORS: {
  label: string;
  tag: string;
  origin: Coordinates;
  destination: Coordinates;
  style: JourneyStyle;
  vehicleId: string;
}[] = [
  {
    label: 'Mumbai → Pune',
    tag: 'Expressway',
    origin: { lat: 19.076, lon: 72.8777, name: 'Mumbai, Maharashtra', state: 'Maharashtra' },
    destination: { lat: 18.5204, lon: 73.8567, name: 'Pune, Maharashtra', state: 'Maharashtra' },
    style: 'Fast',
    vehicleId: 'swift-petrol',
  },
  {
    label: 'Mumbai → Goa',
    tag: 'NH66 Coastal',
    origin: { lat: 19.076, lon: 72.8777, name: 'Mumbai, Maharashtra', state: 'Maharashtra' },
    destination: { lat: 15.2993, lon: 74.124, name: 'Panaji, Goa', state: 'Goa' },
    style: 'Comfort',
    vehicleId: 'creta-diesel',
  },
  {
    label: 'Delhi → Jaipur',
    tag: 'NE4 Corridor',
    origin: { lat: 28.6139, lon: 77.209, name: 'New Delhi, Delhi', state: 'Delhi' },
    destination: { lat: 26.9124, lon: 75.7873, name: 'Jaipur, Rajasthan', state: 'Rajasthan' },
    style: 'Fast',
    vehicleId: 'nexon-ev-long-range',
  },
  {
    label: 'Bengaluru → Chennai',
    tag: 'NH48 Highway',
    origin: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru, Karnataka', state: 'Karnataka' },
    destination: { lat: 13.0827, lon: 80.2707, name: 'Chennai, Tamil Nadu', state: 'Tamil Nadu' },
    style: 'Fast',
    vehicleId: 'innova-hycross-hybrid',
  },
];

export const PlannerCard: React.FC<Props> = ({
  onPlan,
  isLoading,
  initialOrigin,
  initialDestination,
  lang,
}) => {
  const t = TRANSLATIONS[lang];

  // Locations state
  const [originQuery, setOriginQuery] = useState(initialOrigin?.name || 'Mumbai, Maharashtra');
  const [selectedOrigin, setSelectedOrigin] = useState<Coordinates | null>(
    initialOrigin || { lat: 19.076, lon: 72.8777, name: 'Mumbai, Maharashtra', state: 'Maharashtra' }
  );
  const [originSuggestions, setOriginSuggestions] = useState<Coordinates[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  const [destQuery, setDestQuery] = useState(initialDestination?.name || 'Pune, Maharashtra');
  const [selectedDest, setSelectedDest] = useState<Coordinates | null>(
    initialDestination || { lat: 18.5204, lon: 73.8567, name: 'Pune, Maharashtra', state: 'Maharashtra' }
  );
  const [destSuggestions, setDestSuggestions] = useState<Coordinates[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Vehicle state
  const [activeFuelType, setActiveFuelType] = useState<VehicleFuelType>('Petrol');
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePreset>(DEFAULT_VEHICLE);
  const [isCustomVehicle, setIsCustomVehicle] = useState(false);
  const [customEfficiency, setCustomEfficiency] = useState<number>(16.0);
  const [customCapacity, setCustomCapacity] = useState<number>(45);

  // Journey Style state (Required: Fast / Cheap / Comfort)
  const [journeyStyle, setJourneyStyle] = useState<JourneyStyle>('Fast');

  // Departure Time
  const [departureTime, setDepartureTime] = useState<string>('now');

  // Collapsed "Refine" options state
  const [isRefineOpen, setIsRefineOpen] = useState(false);
  const [refinePassengers, setRefinePassengers] = useState(1);
  const [refineAvoidTolls, setRefineAvoidTolls] = useState(false);
  const [refineVegFood, setRefineVegFood] = useState(false);
  const [refineCleanWashrooms, setRefineCleanWashrooms] = useState(true);
  const [refineFamilyFriendly, setRefineFamilyFriendly] = useState(false);
  const [refinePetFriendly, setRefinePetFriendly] = useState(false);

  // Validation / Error state
  const [formError, setFormError] = useState<string | null>(null);
  const [planningStep, setPlanningStep] = useState<string>('');

  // Geolocation state
  const [isLocating, setIsLocating] = useState(false);

  // Debounced search for Origin
  useEffect(() => {
    if (!originQuery || originQuery.length < 2 || (selectedOrigin && selectedOrigin.name === originQuery)) {
      setOriginSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(originQuery)}`);
        if (res.ok) {
          const list = await res.json();
          setOriginSuggestions(list);
          setShowOriginDropdown(true);
        }
      } catch (e) {
        console.warn('Origin autocomplete error:', e);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [originQuery, selectedOrigin]);

  // Debounced search for Destination
  useEffect(() => {
    if (!destQuery || destQuery.length < 2 || (selectedDest && selectedDest.name === destQuery)) {
      setDestSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(destQuery)}`);
        if (res.ok) {
          const list = await res.json();
          setDestSuggestions(list);
          setShowDestDropdown(true);
        }
      } catch (e) {
        console.warn('Destination autocomplete error:', e);
      } finally {
        setIsSearchingDest(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [destQuery, selectedDest]);

  // Handle Fuel Type Change
  const handleFuelTypeChange = (type: VehicleFuelType) => {
    setActiveFuelType(type);
    const presetsForType = INDIAN_VEHICLE_PRESETS.filter((v) => v.fuelType === type);
    if (presetsForType.length > 0) {
      setSelectedVehicle(presetsForType[0]);
    }
  };

  // Swap Locations
  const handleSwapLocations = () => {
    const tempOrigin = selectedOrigin;
    const tempQuery = originQuery;

    setSelectedOrigin(selectedDest);
    setOriginQuery(destQuery);

    setSelectedDest(tempOrigin);
    setDestQuery(tempQuery);
  };

  // Geolocation only on explicit tap
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setFormError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data[0]) {
              setSelectedOrigin(data[0]);
              setOriginQuery(data[0].name);
            } else {
              setSelectedOrigin({
                lat: latitude,
                lon: longitude,
                name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)} (My Location)`,
              });
              setOriginQuery('My Current GPS Location');
            }
          }
        } catch {
          setFormError('Failed to resolve current street address. Using raw coordinates.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        setFormError(`Location permission denied or unavailable: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Progressive loading steps simulation
  useEffect(() => {
    if (!isLoading) {
      setPlanningStep('');
      return;
    }

    const steps = [
      t.planningRoute,
      t.checkingTolls,
      t.findingStops,
      t.scoringCandidates,
    ];

    let current = 0;
    setPlanningStep(steps[0]);

    const interval = setInterval(() => {
      current++;
      if (current < steps.length) {
        setPlanningStep(steps[current]);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [isLoading, t]);

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!selectedOrigin) {
      setFormError('Please select a valid origin place in India from the search dropdown.');
      return;
    }

    if (!selectedDest) {
      setFormError('Please select a valid destination place in India from the search dropdown.');
      return;
    }

    // Check same location
    const d = Math.hypot(selectedOrigin.lat - selectedDest.lat, selectedOrigin.lon - selectedDest.lon);
    if (d < 0.005) {
      setFormError('Origin and destination are identical. Please specify two distinct cities or checkpoints.');
      return;
    }

    // Geographic boundary check (~India bbox 6.5 to 35.5, 68 to 97.5)
    if (
      selectedOrigin.lat < 6.5 ||
      selectedOrigin.lat > 35.5 ||
      selectedOrigin.lon < 68.0 ||
      selectedOrigin.lon > 97.5
    ) {
      setFormError(`Origin "${selectedOrigin.name}" is outside India. NaviFlow is specialized exclusively for Indian national highway networks.`);
      return;
    }
    if (
      selectedDest.lat < 6.5 ||
      selectedDest.lat > 35.5 ||
      selectedDest.lon < 68.0 ||
      selectedDest.lon > 97.5
    ) {
      setFormError(`Destination "${selectedDest.name}" is outside India. NaviFlow is specialized exclusively for Indian national highway networks.`);
      return;
    }

    // Construct vehicle specs
    let finalVehicle = selectedVehicle;
    if (isCustomVehicle) {
      finalVehicle = {
        ...selectedVehicle,
        id: 'custom-user-vehicle',
        name: `Custom ${activeFuelType} Vehicle`,
        efficiency: customEfficiency,
        tankOrBatteryCapacity: customCapacity,
        realWorldRangeKm: Math.round(customEfficiency * customCapacity),
      };
    }

    const refineOptions: RefineOptions = {
      passengers: refinePassengers,
      avoidTolls: refineAvoidTolls,
      vegFood: refineVegFood,
      cleanWashrooms: refineCleanWashrooms,
      familyFriendly: refineFamilyFriendly,
      petFriendly: refinePetFriendly,
    };

    try {
      await onPlan({
        origin: selectedOrigin,
        destination: selectedDest,
        vehicle: finalVehicle,
        journeyStyle,
        departureTime: departureTime === 'now' ? new Date().toISOString() : departureTime,
        refineOptions,
      });
    } catch (err: any) {
      setFormError(err.message || 'Journey calculation failed. Please retry.');
    }
  };

  // Quick Start Handler (Runs live search immediately)
  const handleQuickStart = (corridor: typeof POPULAR_CORRIDORS[0]) => {
    setSelectedOrigin(corridor.origin);
    setOriginQuery(corridor.origin.name);
    setSelectedDest(corridor.destination);
    setDestQuery(corridor.destination.name);
    setJourneyStyle(corridor.style);

    const veh = INDIAN_VEHICLE_PRESETS.find((v) => v.id === corridor.vehicleId) || DEFAULT_VEHICLE;
    setActiveFuelType(veh.fuelType);
    setSelectedVehicle(veh);

    const refineOptions: RefineOptions = {
      passengers: refinePassengers,
      avoidTolls: refineAvoidTolls,
      vegFood: refineVegFood,
      cleanWashrooms: refineCleanWashrooms,
      familyFriendly: refineFamilyFriendly,
      petFriendly: refinePetFriendly,
    };

    onPlan({
      origin: corridor.origin,
      destination: corridor.destination,
      vehicle: veh,
      journeyStyle: corridor.style,
      departureTime: new Date().toISOString(),
      refineOptions,
    }).catch((err) => {
      setFormError(err.message || 'Quick search failed.');
    });
  };

  const filteredPresets = INDIAN_VEHICLE_PRESETS.filter((v) => v.fuelType === activeFuelType);

  return (
    <div className="w-full bg-[#111827] border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl relative">
      {/* Decorative hairline */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-sky-400 to-indigo-500 rounded-t-2xl" />

      {/* Quick-Start Live Search Chips */}
      <div className="mb-4 pt-1">
        <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Quick-Start Live Corridor Plans</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_CORRIDORS.map((c) => (
            <button
              key={c.label}
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickStart(c)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500/60 rounded-lg text-xs font-medium text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{c.label}</span>
              <span className="text-[10px] text-teal-400 font-mono font-normal">({c.tag})</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Banner with Retry */}
        {formError && (
          <div className="flex items-start justify-between gap-3 p-3 bg-red-950/40 border border-red-500/50 rounded-xl text-red-200 text-xs animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-semibold shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. Origin & Destination Input Group */}
        <div className="space-y-2 relative bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          {/* Origin */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.originLabel}</span>
              </label>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <Navigation2 className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : t.useMyLocation}</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={originQuery}
                onChange={(e) => {
                  setOriginQuery(e.target.value);
                  setSelectedOrigin(null);
                }}
                onFocus={() => setShowOriginDropdown(true)}
                placeholder="Search city, town, or highway junction in India..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
              />
              {isSearchingOrigin && (
                <div className="absolute right-3 top-2.5">
                  <RefreshCw className="w-4 h-4 text-teal-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showOriginDropdown && originSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-800">
                {originSuggestions.map((item, idx) => (
                  <button
                    key={`orig-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedOrigin(item);
                      setOriginQuery(item.name);
                      setShowOriginDropdown(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-800 text-xs text-slate-200 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate pr-2">{item.name}</span>
                    <span className="text-[10px] text-teal-400 shrink-0 font-mono">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              type="button"
              onClick={handleSwapLocations}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-full transition-transform hover:rotate-180 cursor-pointer shadow-md"
              title="Swap Origin and Destination"
              aria-label="Swap Locations"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-teal-400" />
            </button>
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span>{t.destLabel}</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={destQuery}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  setSelectedDest(null);
                }}
                onFocus={() => setShowDestDropdown(true)}
                placeholder="Search destination city or landmark in India..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
              />
              {isSearchingDest && (
                <div className="absolute right-3 top-2.5">
                  <RefreshCw className="w-4 h-4 text-teal-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showDestDropdown && destSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-800">
                {destSuggestions.map((item, idx) => (
                  <button
                    key={`dest-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedDest(item);
                      setDestQuery(item.name);
                      setShowDestDropdown(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-800 text-xs text-slate-200 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate pr-2">{item.name}</span>
                    <span className="text-[10px] text-teal-400 shrink-0 font-mono">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Vehicle Powertrain & Selection (Required Input 3) */}
        <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-teal-400" />
              <span>Vehicle &amp; Powertrain</span>
            </span>

            {/* Fuel Type Pills */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
              {(['Petrol', 'Diesel', 'CNG', 'EV'] as VehicleFuelType[]).map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => handleFuelTypeChange(ft)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    activeFuelType === ft
                      ? 'bg-teal-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <select
              value={isCustomVehicle ? 'custom' : selectedVehicle.id}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setIsCustomVehicle(true);
                } else {
                  setIsCustomVehicle(false);
                  const found = INDIAN_VEHICLE_PRESETS.find((v) => v.id === e.target.value);
                  if (found) setSelectedVehicle(found);
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-teal-400 cursor-pointer"
            >
              {filteredPresets.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.efficiency} {v.fuelType === 'EV' ? 'km/kWh' : v.fuelType === 'CNG' ? 'km/kg' : 'km/L'}) · {v.realWorldRangeKm} km range
                </option>
              ))}
              <option value="custom">+ Custom vehicle specifications...</option>
            </select>
          </div>

          {/* Custom vehicle inputs */}
          {isCustomVehicle && (
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">
                  Mileage ({activeFuelType === 'EV' ? 'km/kWh' : 'km/L'})
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={customEfficiency}
                  onChange={(e) => setCustomEfficiency(parseFloat(e.target.value) || 15)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">
                  Capacity ({activeFuelType === 'EV' ? 'kWh' : 'Liters'})
                </label>
                <input
                  type="number"
                  value={customCapacity}
                  onChange={(e) => setCustomCapacity(parseInt(e.target.value, 10) || 45)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Journey Style (Required Input 4: Fast / Cheap / Comfort) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Journey Style Objective
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { style: 'Fast', label: 'Fastest', desc: '50% Time priority' },
                { style: 'Cheap', label: 'Cheapest', desc: '50% Cost / Toll save' },
                { style: 'Comfort', label: 'Comfort', desc: 'Top stops & access' },
              ] as const
            ).map((item) => (
              <button
                key={item.style}
                type="button"
                onClick={() => setJourneyStyle(item.style)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  journeyStyle === item.style
                    ? 'bg-teal-500/10 border-teal-500 text-teal-300 ring-1 ring-teal-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">{item.label}</div>
                <div className="text-[10px] text-slate-400">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Collapsed "Refine" Row (Optional filters & stop modifiers) */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
          <button
            type="button"
            onClick={() => setIsRefineOpen(!isRefineOpen)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs text-slate-300 hover:text-white bg-slate-900/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-semibold">Refine Options (Stops &amp; Split)</span>
              {(refineAvoidTolls || refineVegFood || refineFamilyFriendly || refinePetFriendly || refinePassengers > 1) && (
                <span className="w-2 h-2 rounded-full bg-teal-400" />
              )}
            </div>
            {isRefineOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isRefineOpen && (
            <div className="p-3 space-y-3 text-xs border-t border-slate-800/80 animate-in fade-in">
              <p className="text-[11px] text-slate-400">
                These optional preferences adjust stop-quality ranking and cost split without blocking the plan.
              </p>

              {/* Passengers Stepper */}
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-400" />
                  <span>Passengers (for cost split)</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRefinePassengers((p) => Math.max(1, p - 1))}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-white w-4 text-center">{refinePassengers}</span>
                  <button
                    type="button"
                    onClick={() => setRefinePassengers((p) => Math.min(7, p + 1))}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Avoid Tolls */}
              <label className="flex items-center justify-between cursor-pointer py-1 border-b border-slate-800/60">
                <span className="text-slate-300">Avoid toll plazas (prefer free highways)</span>
                <input
                  type="checkbox"
                  checked={refineAvoidTolls}
                  onChange={(e) => setRefineAvoidTolls(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Clean Washrooms */}
              <label className="flex items-center justify-between cursor-pointer py-1 border-b border-slate-800/60">
                <span className="text-slate-300">Prioritize clean verified washrooms</span>
                <input
                  type="checkbox"
                  checked={refineCleanWashrooms}
                  onChange={(e) => setRefineCleanWashrooms(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Veg food */}
              <label className="flex items-center justify-between cursor-pointer py-1 border-b border-slate-800/60">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pure vegetarian food plazas (Shuddh Shakahari)</span>
                </span>
                <input
                  type="checkbox"
                  checked={refineVegFood}
                  onChange={(e) => setRefineVegFood(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Family / Women / Senior friendly */}
              <label className="flex items-center justify-between cursor-pointer py-1 border-b border-slate-800/60">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Family &amp; Women friendly (well-lit, busy stops)</span>
                </span>
                <input
                  type="checkbox"
                  checked={refineFamilyFriendly}
                  onChange={(e) => setRefineFamilyFriendly(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Pet friendly */}
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Dog className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pet-friendly open grounds &amp; outdoor seating</span>
                </span>
                <input
                  type="checkbox"
                  checked={refinePetFriendly}
                  onChange={(e) => setRefinePetFriendly(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Submit Plan Button (Sticky / prominent, ≥44px touch target) */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full min-h-[48px] bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 disabled:opacity-60 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{planningStep || 'Analyzing Indian Highway Corridors...'}</span>
            </>
          ) : (
            <>
              <Compass className="w-4 h-4" />
              <span>Generate Explained Journey Plan</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
