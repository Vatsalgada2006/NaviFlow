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
} from 'lucide-react';
import { Coordinates, JourneyStyle, VehicleFuelType, VehiclePreset } from '../types';
import { INDIAN_VEHICLE_PRESETS, DEFAULT_VEHICLE } from '../engine/vehicles';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface Props {
  onPlan: (params: {
    origin: Coordinates;
    destination: Coordinates;
    vehicle: VehiclePreset;
    journeyStyle: JourneyStyle;
    departureTime: string;
  }) => Promise<void>;
  isLoading: boolean;
  initialOrigin?: Coordinates | null;
  initialDestination?: Coordinates | null;
  lang: Language;
}

export const PlannerCard: React.FC<Props> = ({
  onPlan,
  isLoading,
  initialOrigin,
  initialDestination,
  lang,
}) => {
  const t = TRANSLATIONS[lang];

  // Locations state
  const [originQuery, setOriginQuery] = useState(initialOrigin?.name || '');
  const [selectedOrigin, setSelectedOrigin] = useState<Coordinates | null>(
    initialOrigin || { lat: 19.076, lon: 72.8777, name: 'Mumbai, Maharashtra', state: 'Maharashtra' }
  );
  const [originSuggestions, setOriginSuggestions] = useState<Coordinates[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  const [destQuery, setDestQuery] = useState(initialDestination?.name || '');
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

  // Journey Style state
  const [journeyStyle, setJourneyStyle] = useState<JourneyStyle>('Fast');

  // Departure Time
  const [departureTime, setDepartureTime] = useState<string>('now');

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

  // Geolocation on tap
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
        } catch (e) {
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    try {
      await onPlan({
        origin: selectedOrigin,
        destination: selectedDest,
        vehicle: finalVehicle,
        journeyStyle,
        departureTime: departureTime === 'now' ? new Date().toISOString() : departureTime,
      });
    } catch (err: any) {
      setFormError(err.message || 'Journey calculation failed. Please retry.');
    }
  };

  const filteredPresets = INDIAN_VEHICLE_PRESETS.filter((v) => v.fuelType === activeFuelType);

  return (
    <div className="w-full bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Decorative hairline gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-400 to-indigo-500" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Banner with Retry */}
        {formError && (
          <div className="flex items-start justify-between gap-3 p-3.5 bg-red-950/40 border border-red-500/50 rounded-xl text-red-200 text-xs sm:text-sm animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-semibold shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. Origin & Destination Input Group */}
        <div className="space-y-3 relative">
          {/* Origin */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {t.originLabel}
              </span>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium transition-colors"
              >
                <Navigation2 className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : t.useMyLocation}</span>
              </button>
            </label>

            <div className="relative">
              <input
                type="text"
                value={originQuery || selectedOrigin?.name || ''}
                onChange={(e) => {
                  setOriginQuery(e.target.value);
                  setSelectedOrigin(null);
                }}
                onFocus={() => setShowOriginDropdown(true)}
                placeholder="Search Indian city, NH junction, or landmark..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 pr-10 transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {isSearchingOrigin ? <RefreshCw className="w-4 h-4 animate-spin text-teal-400" /> : <Search className="w-4 h-4" />}
              </div>
            </div>

            {/* Origin Autocomplete Dropdown */}
            {showOriginDropdown && originSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                {originSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedOrigin(item);
                      setOriginQuery(item.name);
                      setShowOriginDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 hover:bg-slate-800 border-b border-slate-800/80 last:border-0 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button Divider */}
          <div className="flex items-center justify-center -my-1 relative z-10">
            <button
              type="button"
              onClick={handleSwapLocations}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-full transition-all shadow-md focus:outline-none"
              title="Swap Origin & Destination"
              aria-label="Swap locations"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              {t.destLabel}
            </label>

            <div className="relative">
              <input
                type="text"
                value={destQuery || selectedDest?.name || ''}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  setSelectedDest(null);
                }}
                onFocus={() => setShowDestDropdown(true)}
                placeholder="Search destination anywhere in India..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 pr-10 transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {isSearchingDest ? <RefreshCw className="w-4 h-4 animate-spin text-teal-400" /> : <Search className="w-4 h-4" />}
              </div>
            </div>

            {/* Destination Autocomplete Dropdown */}
            {showDestDropdown && destSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                {destSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedDest(item);
                      setDestQuery(item.name);
                      setShowDestDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 hover:bg-slate-800 border-b border-slate-800/80 last:border-0 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Vehicle Powertrain & Model Selection */}
        <div className="space-y-3 pt-1 border-t border-slate-800/80">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-teal-400" />
            {t.vehicleLabel}
          </label>

          {/* Powertrain Segmented Filter */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {(['Petrol', 'Diesel', 'CNG', 'EV'] as VehicleFuelType[]).map((fuel) => (
              <button
                key={fuel}
                type="button"
                onClick={() => handleFuelTypeChange(fuel)}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeFuelType === fuel
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fuel === 'EV' ? <Zap className="w-3 h-3" /> : <Fuel className="w-3 h-3" />}
                <span>{fuel}</span>
              </button>
            ))}
          </div>

          {/* Model Preset Picker & Custom Specification */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={selectedVehicle.id}
                onChange={(e) => {
                  const match = INDIAN_VEHICLE_PRESETS.find((v) => v.id === e.target.value);
                  if (match) {
                    setSelectedVehicle(match);
                    setCustomEfficiency(match.efficiency);
                    setCustomCapacity(match.tankOrBatteryCapacity);
                  }
                }}
                disabled={isCustomVehicle}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-teal-400"
              >
                {filteredPresets.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.efficiency} {v.fuelType === 'EV' ? 'km/kWh' : v.fuelType === 'CNG' ? 'km/kg' : 'km/L'}, ~{v.realWorldRangeKm} km range)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsCustomVehicle(!isCustomVehicle)}
                className={`px-3 py-2 text-xs rounded-xl border transition-colors whitespace-nowrap cursor-pointer ${
                  isCustomVehicle
                    ? 'bg-teal-950/60 border-teal-500 text-teal-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {isCustomVehicle ? 'Custom Spec' : 'Edit Spec'}
              </button>
            </div>

            {/* Custom vehicle inline inputs if toggled */}
            {isCustomVehicle && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs animate-in fade-in">
                <div>
                  <span className="text-slate-400 block mb-1">
                    Efficiency ({activeFuelType === 'EV' ? 'km/kWh' : activeFuelType === 'CNG' ? 'km/kg' : 'km/L'})
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={customEfficiency}
                    onChange={(e) => setCustomEfficiency(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">
                    Tank/Battery ({activeFuelType === 'EV' ? 'kWh' : activeFuelType === 'CNG' ? 'kg' : 'Liters'})
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    value={customCapacity}
                    onChange={(e) => setCustomCapacity(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Journey Style Segmented Control (Fast / Cheap / Comfort) */}
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-teal-400" />
            {t.styleLabel}
          </label>

          <div className="grid grid-cols-3 gap-2">
            {(['Fast', 'Cheap', 'Comfort'] as JourneyStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setJourneyStyle(style)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                  journeyStyle === style
                    ? 'bg-slate-800 border-teal-400 text-teal-300 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div>{style}</div>
                <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                  {style === 'Fast' ? '50% Time' : style === 'Cheap' ? '50% Cost' : '60% Comfort & Stops'}
                </div>
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            {journeyStyle === 'Fast'
              ? t.styleFastDesc
              : journeyStyle === 'Cheap'
              ? t.styleCheapDesc
              : t.styleComfortDesc}
          </p>
        </div>

        {/* 4. Optional Departure Time */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Departure Time:</span>
          </div>
          <select
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-teal-400"
          >
            <option value="now">Leave Now (Default)</option>
            <option value="morning">Tomorrow Morning (06:00 AM)</option>
            <option value="night">Tonight (09:00 PM - Glare test)</option>
          </select>
        </div>

        {/* 5. Big Submit Button with Progressive Status */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
              isLoading
                ? 'bg-slate-800 text-teal-300 border border-teal-500/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-slate-950 hover:shadow-teal-500/20'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                <span className="truncate">{planningStep || t.planningRoute}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>{t.planJourneyBtn}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
