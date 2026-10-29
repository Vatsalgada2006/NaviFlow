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
  ShieldAlert,
  Dog,
  Compass,
  History,
  Mic,
  MicOff,
  Plus,
  Trash2,
  Moon,
  Coffee,
  CheckCircle2,
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

export interface RecentTrip {
  origin: Coordinates;
  destination: Coordinates;
  vehicle: VehiclePreset;
  journeyStyle: JourneyStyle;
  timestamp: string;
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

const STORAGE_LAST_STATE_KEY = 'naviflow_last_query_v3';
const STORAGE_RECENT_TRIPS_KEY = 'naviflow_recent_trips_v3';

export const PlannerCard: React.FC<Props> = ({
  onPlan,
  isLoading,
  initialOrigin,
  initialDestination,
  lang,
}) => {
  const t = TRANSLATIONS[lang];

  // Load returning user state
  const loadSavedState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_LAST_STATE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const savedState = loadSavedState();

  // Natural Language Single-Sentence Prompt state
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isParsingSentence, setIsParsingSentence] = useState(false);
  const [sentenceSuccessMsg, setSentenceSuccessMsg] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  // Locations state
  const [originQuery, setOriginQuery] = useState(
    initialOrigin?.name || savedState?.origin?.name || 'Mumbai, Maharashtra'
  );
  const [selectedOrigin, setSelectedOrigin] = useState<Coordinates | null>(
    initialOrigin || savedState?.origin || { lat: 19.076, lon: 72.8777, name: 'Mumbai, Maharashtra', state: 'Maharashtra' }
  );
  const [originSuggestions, setOriginSuggestions] = useState<Coordinates[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  const [destQuery, setDestQuery] = useState(
    initialDestination?.name || savedState?.destination?.name || 'Pune, Maharashtra'
  );
  const [selectedDest, setSelectedDest] = useState<Coordinates | null>(
    initialDestination || savedState?.destination || { lat: 18.5204, lon: 73.8567, name: 'Pune, Maharashtra', state: 'Maharashtra' }
  );
  const [destSuggestions, setDestSuggestions] = useState<Coordinates[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Intermediate Via-stops (up to 3)
  const [viaStops, setViaStops] = useState<Coordinates[]>([]);
  const [newViaQuery, setNewViaQuery] = useState('');
  const [isSearchingVia, setIsSearchingVia] = useState(false);
  const [viaSuggestions, setViaSuggestions] = useState<Coordinates[]>([]);
  const [showViaDropdown, setShowViaDropdown] = useState(false);
  const [showAddViaInput, setShowAddViaInput] = useState(false);

  // Vehicle state
  const initialVeh = savedState?.vehicle || DEFAULT_VEHICLE;
  const [activeFuelType, setActiveFuelType] = useState<VehicleFuelType>(initialVeh.fuelType || 'Petrol');
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePreset>(initialVeh);
  const [isCustomVehicle, setIsCustomVehicle] = useState(false);
  const [customEfficiency, setCustomEfficiency] = useState<number>(16.0);
  const [customCapacity, setCustomCapacity] = useState<number>(45);

  // Journey Style state (Required: Fast / Cheap / Comfort)
  const [journeyStyle, setJourneyStyle] = useState<JourneyStyle>(savedState?.journeyStyle || 'Fast');

  // Departure vs Arrive-By Timing Mode
  const [timingMode, setTimingMode] = useState<'depart_at' | 'arrive_by'>('depart_at');
  const [departureTime, setDepartureTime] = useState<string>('now');
  const [arriveByTime, setArriveByTime] = useState<string>('20:00');

  // Collapsed "Refine" options state
  const [isRefineOpen, setIsRefineOpen] = useState(false);
  const [refinePassengers, setRefinePassengers] = useState(1);
  const [refineAvoidTolls, setRefineAvoidTolls] = useState(false);
  const [refineVegFood, setRefineVegFood] = useState(false);
  const [refineCleanWashrooms, setRefineCleanWashrooms] = useState(true);
  const [refineFamilyFriendly, setRefineFamilyFriendly] = useState(false);
  const [refinePetFriendly, setRefinePetFriendly] = useState(false);
  const [refineNightDrivingHalt, setRefineNightDrivingHalt] = useState(false);
  const [refinePreferMealWindows, setRefinePreferMealWindows] = useState(false);

  // Recent trips state
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

  // Validation / Error state
  const [formError, setFormError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Load recent trips from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_RECENT_TRIPS_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          setRecentTrips(list.slice(0, 3));
        }
      }
    } catch {}
  }, []);

  // Save last query state
  const persistQueryState = (orig: Coordinates, dest: Coordinates, veh: VehiclePreset, style: JourneyStyle) => {
    try {
      localStorage.setItem(STORAGE_LAST_STATE_KEY, JSON.stringify({ origin: orig, destination: dest, vehicle: veh, journeyStyle: style }));
      
      const prevRaw = localStorage.getItem(STORAGE_RECENT_TRIPS_KEY);
      let list: RecentTrip[] = prevRaw ? JSON.parse(prevRaw) : [];
      if (!Array.isArray(list)) list = [];

      list = list.filter(
        (t) => !(t.origin.name === orig.name && t.destination.name === dest.name)
      );

      list.unshift({
        origin: orig,
        destination: dest,
        vehicle: veh,
        journeyStyle: style,
        timestamp: new Date().toISOString(),
      });

      const updated = list.slice(0, 3);
      localStorage.setItem(STORAGE_RECENT_TRIPS_KEY, JSON.stringify(updated));
      setRecentTrips(updated);
    } catch {}
  };

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

  // Debounced search for Via Stop
  useEffect(() => {
    if (!newViaQuery || newViaQuery.length < 2) {
      setViaSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingVia(true);
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(newViaQuery)}`);
        if (res.ok) {
          const list = await res.json();
          setViaSuggestions(list);
          setShowViaDropdown(true);
        }
      } catch {
      } finally {
        setIsSearchingVia(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [newViaQuery]);

  // Web Speech API initialization for voice input
  const toggleVoiceRecording = () => {
    if (isListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFormError('Voice recognition is not supported in this browser. Please type your trip description.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setFormError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNaturalQuery(transcript);
        setIsListening(false);
        handleParseNaturalSentence(transcript);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
        if (e.error !== 'no-speech') {
          setFormError('Could not capture voice audio. Please try speaking clearly or type your trip description.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setFormError('Unable to start voice recognition.');
      setIsListening(false);
    }
  };

  // Submit Natural Language Trip description to Gemini parser
  const handleParseNaturalSentence = async (textToParse?: string) => {
    const promptText = (textToParse || naturalQuery).trim();
    if (!promptText) return;

    setIsParsingSentence(true);
    setSentenceSuccessMsg(null);
    setFormError(null);

    try {
      const res = await fetch('/api/parse-trip-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: promptText }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Trip parser unavailable right now. Please fill the fields below.');
      }

      const data = await res.json();
      if (!data.success || !data.parsed) {
        throw new Error('Could not identify trip locations. Please verify with the standard form below.');
      }

      const p = data.parsed;

      // 1. Origin & Destination
      if (data.origin) {
        setSelectedOrigin(data.origin);
        setOriginQuery(data.origin.name);
      }
      if (data.destination) {
        setSelectedDest(data.destination);
        setDestQuery(data.destination.name);
      }

      // 2. Via Stops
      if (Array.isArray(data.viaStops) && data.viaStops.length > 0) {
        setViaStops(data.viaStops.slice(0, 3));
      }

      // 3. Vehicle
      if (p.vehiclePresetId) {
        const matchedVeh = INDIAN_VEHICLE_PRESETS.find((v) => v.id === p.vehiclePresetId);
        if (matchedVeh) {
          setSelectedVehicle(matchedVeh);
          setActiveFuelType(matchedVeh.fuelType);
          setIsCustomVehicle(false);
        }
      }

      // 4. Style
      if (p.journeyStyle) {
        setJourneyStyle(p.journeyStyle);
      }

      // 5. Constraints & Refine
      if (p.avoidTolls !== undefined) setRefineAvoidTolls(Boolean(p.avoidTolls));
      if (p.vegFood !== undefined) setRefineVegFood(Boolean(p.vegFood));
      if (p.familyFriendly !== undefined) setRefineFamilyFriendly(Boolean(p.familyFriendly));
      if (p.cleanWashrooms !== undefined) setRefineCleanWashrooms(Boolean(p.cleanWashrooms));
      if (p.avoidDrivingAfter10pm) setRefineNightDrivingHalt(true);

      const summaryParts = [
        data.origin?.name?.split(',')[0],
        '→',
        data.destination?.name?.split(',')[0],
      ];
      if (data.viaStops?.length) {
        summaryParts.push(`(via ${data.viaStops.map((s: Coordinates) => s.name.split(',')[0]).join(', ')})`);
      }
      if (p.vehiclePresetId) {
        summaryParts.push(`in ${p.vehiclePresetId.replace(/-/g, ' ')}`);
      }

      setSentenceSuccessMsg(`Pre-filled: ${summaryParts.join(' ')}. Verify details below and click "Plan Journey".`);
    } catch (err: any) {
      setFormError(err.message || 'Could not parse trip description automatically. Please use standard inputs.');
    } finally {
      setIsParsingSentence(false);
    }
  };

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
          const res = await fetch(`/api/reverse?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const place = await res.json();
            setSelectedOrigin(place);
            setOriginQuery(place.name);
          } else {
            const fallback: Coordinates = {
              lat: latitude,
              lon: longitude,
              name: `GPS Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
            };
            setSelectedOrigin(fallback);
            setOriginQuery(fallback.name);
          }
        } catch {
          setFormError('Could not resolve GPS coordinates to a highway place.');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setFormError('Location access was denied or timed out.');
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  // Form Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    let currentOrigin = selectedOrigin;
    if (!currentOrigin && originQuery.trim()) {
      if (originSuggestions.length > 0) {
        currentOrigin = originSuggestions[0];
        setSelectedOrigin(currentOrigin);
      } else {
        try {
          const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(originQuery.trim())}`);
          if (res.ok) {
            const list = await res.json();
            if (list.length > 0) {
              currentOrigin = list[0];
              setSelectedOrigin(currentOrigin);
            }
          }
        } catch {}
      }
    }

    let currentDest = selectedDest;
    if (!currentDest && destQuery.trim()) {
      if (destSuggestions.length > 0) {
        currentDest = destSuggestions[0];
        setSelectedDest(currentDest);
      } else {
        try {
          const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(destQuery.trim())}`);
          if (res.ok) {
            const list = await res.json();
            if (list.length > 0) {
              currentDest = list[0];
              setSelectedDest(currentDest);
            }
          }
        } catch {}
      }
    }

    if (!currentOrigin) {
      setFormError('Please enter a valid origin place in India.');
      return;
    }

    if (!currentDest) {
      setFormError('Please enter a valid destination place in India.');
      return;
    }

    const d = Math.hypot(currentOrigin.lat - currentDest.lat, currentOrigin.lon - currentDest.lon);
    if (d < 0.005) {
      setFormError('Origin and destination are identical. Please specify two distinct cities or checkpoints.');
      return;
    }

    if (
      currentOrigin.lat < 6.5 ||
      currentOrigin.lat > 35.5 ||
      currentOrigin.lon < 68.0 ||
      currentOrigin.lon > 97.5
    ) {
      setFormError(`Origin "${currentOrigin.name}" is outside India. NaviFlow is specialized exclusively for Indian national highway networks.`);
      return;
    }
    if (
      currentDest.lat < 6.5 ||
      currentDest.lat > 35.5 ||
      currentDest.lon < 68.0 ||
      currentDest.lon > 97.5
    ) {
      setFormError(`Destination "${currentDest.name}" is outside India. NaviFlow is specialized exclusively for Indian national highway networks.`);
      return;
    }

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
      viaStops: viaStops.length > 0 ? viaStops : undefined,
      arriveByTime: timingMode === 'arrive_by' ? arriveByTime : undefined,
      nightDrivingHalt: refineNightDrivingHalt,
      preferMealWindows: refinePreferMealWindows,
    };

    persistQueryState(currentOrigin, currentDest, finalVehicle, journeyStyle);

    try {
      await onPlan({
        origin: currentOrigin,
        destination: currentDest,
        vehicle: finalVehicle,
        journeyStyle,
        departureTime: departureTime === 'now' ? new Date().toISOString() : departureTime,
        refineOptions,
      });
    } catch (err: any) {
      setFormError(err.message || 'Journey calculation failed. Please retry.');
    }
  };

  // Quick Start Handler
  const handleQuickStart = (corridor: typeof POPULAR_CORRIDORS[0]) => {
    setSelectedOrigin(corridor.origin);
    setOriginQuery(corridor.origin.name);
    setSelectedDest(corridor.destination);
    setDestQuery(corridor.destination.name);
    setJourneyStyle(corridor.style);
    setViaStops([]);

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

    persistQueryState(corridor.origin, corridor.destination, veh, corridor.style);

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

  const handleRecentTripClick = (trip: RecentTrip) => {
    setSelectedOrigin(trip.origin);
    setOriginQuery(trip.origin.name);
    setSelectedDest(trip.destination);
    setDestQuery(trip.destination.name);
    setSelectedVehicle(trip.vehicle);
    setActiveFuelType(trip.vehicle.fuelType);
    setJourneyStyle(trip.journeyStyle);
    setViaStops([]);

    onPlan({
      origin: trip.origin,
      destination: trip.destination,
      vehicle: trip.vehicle,
      journeyStyle: trip.journeyStyle,
      departureTime: new Date().toISOString(),
      refineOptions: {
        passengers: refinePassengers,
        avoidTolls: refineAvoidTolls,
        vegFood: refineVegFood,
        cleanWashrooms: refineCleanWashrooms,
        familyFriendly: refineFamilyFriendly,
        petFriendly: refinePetFriendly,
      },
    }).catch((err) => {
      setFormError(err.message || 'Recent trip search failed.');
    });
  };

  const filteredPresets = INDIAN_VEHICLE_PRESETS.filter((v) => v.fuelType === activeFuelType);

  return (
    <div className="w-full bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 shadow-sm relative">
      {/* Subtle Highway Green accent hairline */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#0B6B3A] rounded-t-2xl" />

      {/* PLAN IN ONE SENTENCE (LLM input, optional) */}
      <div className="mb-5 p-3.5 bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#F5A524]" />
            <span>Describe your trip (Natural Language)</span>
          </label>
          <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E]">Voice or text</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={naturalQuery}
              onChange={(e) => setNaturalQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleParseNaturalSentence();
                }
              }}
              placeholder="e.g. Mumbai to Goa in Creta Diesel with 1 stop in Kolhapur, pure veg"
              className="w-full min-h-[44px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3.5 py-2 text-sm text-[#1C1B1A] dark:text-[#F5F4F0] placeholder-[#5C5A57] dark:placeholder-[#A8A29E] focus:outline-none focus:border-[#0B6B3A]"
            />
          </div>

          {/* Microphone Web Speech Button */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            title={isListening ? 'Stop listening' : 'Speak trip description'}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
              isListening
                ? 'bg-red-600 border-red-700 text-white animate-pulse'
                : 'bg-white dark:bg-[#1B1D1A] border-[#E6E2DC] dark:border-[#2E302B] text-[#1C1B1A] dark:text-[#F5F4F0] hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />}
          </button>

          {/* Parse Button */}
          <button
            type="button"
            onClick={() => handleParseNaturalSentence()}
            disabled={isParsingSentence || !naturalQuery.trim()}
            className="min-h-[44px] px-3.5 bg-[#0B6B3A] hover:bg-[#08522C] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {isParsingSentence ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>Fill Form</span>
            )}
          </button>
        </div>

        {/* Quick Example Prompt Chips */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E] self-center mr-1">Try:</span>
          {[
            'Mumbai to Goa in Creta Diesel via Kolhapur, veg',
            'Delhi to Jaipur in Nexon EV leaving 7 AM',
            'Bengaluru to Chennai avoid tolls',
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setNaturalQuery(sample);
                handleParseNaturalSentence(sample);
              }}
              className="text-xs px-2.5 py-1 bg-white dark:bg-[#1B1D1A] hover:bg-stone-100 dark:hover:bg-stone-800 text-[#1C1B1A] dark:text-[#F5F4F0] border border-[#E6E2DC] dark:border-[#2E302B] rounded-md transition-colors cursor-pointer text-left"
            >
              "{sample}"
            </button>
          ))}
        </div>

        {/* Success Feedback banner */}
        {sentenceSuccessMsg && (
          <div className="mt-2.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{sentenceSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Returning User: Continue Last Trip & Recent Trips (1-tap chips) */}
      {recentTrips.length > 0 && (
        <div className="mb-4 space-y-2.5 pt-1 pb-3 border-b border-[#E6E2DC] dark:border-[#2E302B]">
          {/* Prominent Continue Last Trip Chip */}
          <div className="p-2.5 bg-[#0B6B3A]/10 border border-[#0B6B3A]/30 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-[#0B6B3A] dark:text-[#22C55E] truncate">
              <History className="w-4 h-4 shrink-0" />
              <span className="font-semibold truncate">
                Continue your last trip: {recentTrips[0].origin.name.split(',')[0]} → {recentTrips[0].destination.name.split(',')[0]}
              </span>
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleRecentTripClick(recentTrips[0])}
              className="min-h-[36px] px-3 py-1 bg-[#0B6B3A] hover:bg-[#08522C] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Resume
            </button>
          </div>

          {/* Last 3 trips as one-tap chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {recentTrips.slice(0, 3).map((trip, idx) => (
              <button
                key={`recent-${idx}`}
                type="button"
                disabled={isLoading}
                onClick={() => handleRecentTripClick(trip)}
                className="min-h-[44px] px-3 py-1.5 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg text-sm font-medium text-[#1C1B1A] dark:text-[#F5F4F0] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{trip.origin.name.split(',')[0]} → {trip.destination.name.split(',')[0]}</span>
                <span className="text-xs text-[#0B6B3A] dark:text-[#22C55E] font-semibold">({trip.journeyStyle})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick-Start Live Search Chips */}
      <div className="mb-5 pt-1">
        <div className="text-sm font-semibold text-[#5C5A57] dark:text-[#A8A29E] mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#F5A524]" />
          <span>Quick-Start Live Highway Plans</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_CORRIDORS.map((c) => (
            <button
              key={c.label}
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickStart(c)}
              className="min-h-[44px] px-3.5 py-2 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] hover:border-[#0B6B3A] rounded-lg text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{c.label}</span>
              <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] font-normal">· {c.tag}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Banner with Retry */}
        {formError && (
          <div className="flex items-start justify-between gap-3 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200 text-sm animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="min-h-[44px] px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-semibold shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. Origin & Destination Input Group with Via-Stops */}
        <div className="space-y-3 p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
          {/* Origin */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
                <span>Origin</span>
              </label>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="min-h-[44px] px-2 text-sm text-[#0B6B3A] dark:text-[#22C55E] hover:underline flex items-center gap-1 font-semibold transition-colors cursor-pointer"
              >
                <Navigation2 className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
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
                className="w-full min-h-[44px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3.5 py-2.5 text-base text-[#1C1B1A] dark:text-[#F5F4F0] placeholder-[#5C5A57] dark:placeholder-[#A8A29E] focus:outline-none focus:border-[#0B6B3A] focus:ring-1 focus:ring-[#0B6B3A]"
              />
              {isSearchingOrigin && (
                <div className="absolute right-3.5 top-3">
                  <RefreshCw className="w-5 h-5 text-[#0B6B3A] animate-spin" />
                </div>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showOriginDropdown && originSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-[#E6E2DC] dark:divide-[#2E302B]">
                {originSuggestions.map((item, idx) => (
                  <button
                    key={`orig-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedOrigin(item);
                      setOriginQuery(item.name);
                      setShowOriginDropdown(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3.5 py-2.5 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 text-sm text-[#1C1B1A] dark:text-[#F5F4F0] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate pr-2 font-medium">{item.name}</span>
                    <span className="text-sm text-[#0B6B3A] dark:text-[#22C55E] shrink-0 font-semibold">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Intermediate Stops (Via-stops list) */}
          {viaStops.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-[#E6E2DC] dark:border-[#2E302B]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5C5A57] dark:text-[#A8A29E]">
                Intermediate Stops ({viaStops.length}/3)
              </span>
              <div className="space-y-1.5">
                {viaStops.map((stop, idx) => (
                  <div
                    key={`via-${idx}`}
                    className="flex items-center justify-between p-2 bg-white dark:bg-[#1B1D1A] rounded-lg border border-[#E6E2DC] dark:border-[#2E302B] text-sm"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="w-5 h-5 rounded-full bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] text-xs font-bold flex items-center justify-center text-[#0B6B3A] dark:text-[#22C55E]">
                        {idx + 1}
                      </span>
                      <span className="truncate font-medium text-[#1C1B1A] dark:text-[#F5F4F0]">{stop.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViaStops(viaStops.filter((_, i) => i !== idx))}
                      className="min-h-[44px] min-w-[44px] p-2 text-stone-400 hover:text-red-600 transition-colors flex items-center justify-center cursor-pointer"
                      title="Remove intermediate stop"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Via-stop control */}
          {viaStops.length < 3 && (
            <div className="pt-1">
              {!showAddViaInput ? (
                <button
                  type="button"
                  onClick={() => setShowAddViaInput(true)}
                  className="text-xs font-semibold text-[#0B6B3A] dark:text-[#22C55E] hover:underline flex items-center gap-1 cursor-pointer py-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add intermediate stop (waypoint)</span>
                </button>
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newViaQuery}
                      onChange={(e) => setNewViaQuery(e.target.value)}
                      placeholder="Add waypoint (e.g. Kolhapur, Lonavala)..."
                      className="flex-1 min-h-[40px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3 py-1.5 text-sm text-[#1C1B1A] dark:text-[#F5F4F0] focus:outline-none focus:border-[#0B6B3A]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddViaInput(false);
                        setNewViaQuery('');
                        setShowViaDropdown(false);
                      }}
                      className="text-xs text-[#5C5A57] dark:text-[#A8A29E] hover:underline px-2 py-1 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Via Suggestions Dropdown */}
                  {showViaDropdown && viaSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-[#E6E2DC] dark:divide-[#2E302B]">
                      {viaSuggestions.map((item, idx) => (
                        <button
                          key={`via-sugg-${idx}`}
                          type="button"
                          onClick={() => {
                            setViaStops([...viaStops, item]);
                            setNewViaQuery('');
                            setShowViaDropdown(false);
                            setShowAddViaInput(false);
                          }}
                          className="w-full min-h-[44px] text-left px-3.5 py-2.5 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 text-sm text-[#1C1B1A] dark:text-[#F5F4F0] transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate pr-2 font-medium">{item.name}</span>
                          <span className="text-sm text-[#0B6B3A] dark:text-[#22C55E] shrink-0 font-semibold">+ Add</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Swap Button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              type="button"
              onClick={handleSwapLocations}
              className="min-h-[44px] min-w-[44px] p-2 bg-white dark:bg-[#1B1D1A] hover:bg-[#FAF8F5] dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] text-[#5C5A57] dark:text-[#A8A29E] rounded-full transition-transform hover:rotate-180 cursor-pointer shadow-sm flex items-center justify-center"
              title="Swap Origin and Destination"
              aria-label="Swap Locations"
            >
              <ArrowUpDown className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
            </button>
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="block text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#DC2626]" />
              <span>Destination</span>
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
                className="w-full min-h-[44px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3.5 py-2.5 text-base text-[#1C1B1A] dark:text-[#F5F4F0] placeholder-[#5C5A57] dark:placeholder-[#A8A29E] focus:outline-none focus:border-[#0B6B3A] focus:ring-1 focus:ring-[#0B6B3A]"
              />
              {isSearchingDest && (
                <div className="absolute right-3.5 top-3">
                  <RefreshCw className="w-5 h-5 text-[#0B6B3A] animate-spin" />
                </div>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showDestDropdown && destSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-[#E6E2DC] dark:divide-[#2E302B]">
                {destSuggestions.map((item, idx) => (
                  <button
                    key={`dest-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedDest(item);
                      setDestQuery(item.name);
                      setShowDestDropdown(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3.5 py-2.5 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 text-sm text-[#1C1B1A] dark:text-[#F5F4F0] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate pr-2 font-medium">{item.name}</span>
                    <span className="text-sm text-[#0B6B3A] dark:text-[#22C55E] shrink-0 font-semibold">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Timing: Depart At vs Arrive By Mode */}
        <div className="space-y-2 p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Schedule Timing</span>
            </span>

            {/* Mode switch */}
            <div className="flex items-center gap-1 p-0.5 bg-white dark:bg-[#1B1D1A] rounded-lg border border-[#E6E2DC] dark:border-[#2E302B]">
              <button
                type="button"
                onClick={() => setTimingMode('depart_at')}
                className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  timingMode === 'depart_at'
                    ? 'bg-[#0B6B3A] text-white'
                    : 'text-[#5C5A57] dark:text-[#A8A29E]'
                }`}
              >
                Depart At
              </button>
              <button
                type="button"
                onClick={() => setTimingMode('arrive_by')}
                className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  timingMode === 'arrive_by'
                    ? 'bg-[#0B6B3A] text-white'
                    : 'text-[#5C5A57] dark:text-[#A8A29E]'
                }`}
              >
                Arrive By
              </button>
            </div>
          </div>

          {timingMode === 'depart_at' ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDepartureTime('now')}
                className={`min-h-[44px] px-3 py-2 text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
                  departureTime === 'now'
                    ? 'bg-[#0B6B3A] text-white border-[#0B6B3A]'
                    : 'bg-white dark:bg-[#1B1D1A] text-[#1C1B1A] dark:text-[#F5F4F0] border-[#E6E2DC] dark:border-[#2E302B]'
                }`}
              >
                Leave Now
              </button>
              <input
                type="datetime-local"
                value={departureTime === 'now' ? '' : departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                placeholder="Pick date/time"
                className="min-h-[44px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-2.5 py-2 text-sm text-[#1C1B1A] dark:text-[#F5F4F0] focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>
          ) : (
            <div className="space-y-1 pt-1">
              <label className="text-xs text-[#5C5A57] dark:text-[#A8A29E]">
                Target arrival time (we'll compute the latest recommended departure time):
              </label>
              <input
                type="time"
                value={arriveByTime}
                onChange={(e) => setArriveByTime(e.target.value)}
                className="w-full min-h-[44px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3 py-2 text-sm text-[#1C1B1A] dark:text-[#F5F4F0] focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>
          )}
        </div>

        {/* 3. Vehicle Powertrain & Selection */}
        <div className="space-y-3 p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-1.5">
              <Car className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Vehicle &amp; Powertrain</span>
            </span>

            {/* Fuel Type Segmented Control */}
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#1B1D1A] rounded-lg border border-[#E6E2DC] dark:border-[#2E302B]">
              {(['Petrol', 'Diesel', 'CNG', 'EV'] as VehicleFuelType[]).map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => handleFuelTypeChange(ft)}
                  className={`min-h-[40px] px-3 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                    activeFuelType === ft
                      ? 'bg-[#0B6B3A] text-white shadow-sm'
                      : 'text-[#5C5A57] dark:text-[#A8A29E] hover:text-[#1C1B1A] dark:hover:text-[#F5F4F0]'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Preset Selector */}
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
              className="w-full min-h-[44px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3.5 py-2.5 text-base text-[#1C1B1A] dark:text-[#F5F4F0] focus:outline-none focus:border-[#0B6B3A]"
            >
              {filteredPresets.map((veh) => (
                <option key={veh.id} value={veh.id}>
                  {veh.name} ({veh.efficiency} {activeFuelType === 'EV' ? 'km/kWh' : activeFuelType === 'CNG' ? 'km/kg' : 'km/L'}, ~{veh.realWorldRangeKm} km range)
                </option>
              ))}
              <option value="custom">+ Custom vehicle specifications...</option>
            </select>
          </div>

          {/* Custom Vehicle Fields */}
          {isCustomVehicle && (
            <div className="grid grid-cols-2 gap-3 pt-2 text-sm border-t border-[#E6E2DC] dark:border-[#2E302B]">
              <div>
                <label className="block text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E] mb-1">
                  Efficiency ({activeFuelType === 'EV' ? 'km/kWh' : activeFuelType === 'CNG' ? 'km/kg' : 'km/L'})
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={customEfficiency}
                  onChange={(e) => setCustomEfficiency(parseFloat(e.target.value) || 12)}
                  className="w-full min-h-[44px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3 py-2 text-base text-[#1C1B1A] dark:text-[#F5F4F0]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E] mb-1">
                  Capacity ({activeFuelType === 'EV' ? 'kWh' : activeFuelType === 'CNG' ? 'kg' : 'Liters'})
                </label>
                <input
                  type="number"
                  step="1"
                  value={customCapacity}
                  onChange={(e) => setCustomCapacity(parseFloat(e.target.value) || 40)}
                  className="w-full min-h-[44px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3 py-2 text-base text-[#1C1B1A] dark:text-[#F5F4F0]"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Journey Style (Required Input: Fast / Cheap / Comfort) */}
        <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
          <label className="block text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] mb-2 flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Journey Style Priority</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Fast', 'Cheap', 'Comfort'] as JourneyStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setJourneyStyle(style)}
                className={`min-h-[44px] py-2.5 px-3 rounded-lg text-sm font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                  journeyStyle === style
                    ? 'bg-[#0B6B3A] text-white shadow-sm ring-1 ring-[#0B6B3A]'
                    : 'bg-white dark:bg-[#1B1D1A] text-[#1C1B1A] dark:text-[#F5F4F0] border border-[#E6E2DC] dark:border-[#2E302B] hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                <span>{style}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. Optional Collapsed "Refine" Row */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl overflow-hidden bg-[#FAF8F5] dark:bg-[#121311]">
          <button
            type="button"
            onClick={() => setIsRefineOpen(!isRefineOpen)}
            className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-left text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Refine Preferences</span>
              <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] font-normal">(Optional)</span>
            </div>
            {isRefineOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {isRefineOpen && (
            <div className="p-4 space-y-3.5 text-sm border-t border-[#E6E2DC] dark:border-[#2E302B] bg-white dark:bg-[#1B1D1A]">
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Adjust stop-quality ranking and cost split without blocking the plan.
              </p>

              {/* Passengers Stepper */}
              <div className="flex items-center justify-between py-1.5 border-b border-[#E6E2DC] dark:border-[#2E302B]">
                <span className="text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2 font-medium">
                  <Users className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
                  <span>Passengers (for cost split)</span>
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRefinePassengers((p) => Math.max(1, p - 1))}
                    className="min-h-[44px] min-w-[44px] rounded-lg bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] text-[#1C1B1A] dark:text-[#F5F4F0] font-bold flex items-center justify-center cursor-pointer text-base"
                  >
                    -
                  </button>
                  <span className="font-bold text-base text-[#1C1B1A] dark:text-[#F5F4F0] w-6 text-center tabular-nums">
                    {refinePassengers}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRefinePassengers((p) => Math.min(7, p + 1))}
                    className="min-h-[44px] min-w-[44px] rounded-lg bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] text-[#1C1B1A] dark:text-[#F5F4F0] font-bold flex items-center justify-center cursor-pointer text-base"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Avoid Tolls */}
              <label className="min-h-[44px] flex items-center justify-between cursor-pointer py-1.5 border-b border-[#E6E2DC] dark:border-[#2E302B]">
                <span className="text-[#1C1B1A] dark:text-[#F5F4F0] font-medium">Avoid tolls (prefer free highways)</span>
                <input
                  type="checkbox"
                  checked={refineAvoidTolls}
                  onChange={(e) => setRefineAvoidTolls(e.target.checked)}
                  className="rounded border-[#E6E2DC] text-[#0B6B3A] focus:ring-0 w-5 h-5 cursor-pointer"
                />
              </label>

              {/* Night Driving: Avoid driving after 10 PM */}
              <label className="min-h-[44px] flex items-center justify-between cursor-pointer py-1.5 border-b border-[#E6E2DC] dark:border-[#2E302B]">
                <span className="text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2 font-medium">
                  <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Avoid driving after 10 PM (recommend overnight halt)</span>
                </span>
                <input
                  type="checkbox"
                  checked={refineNightDrivingHalt}
                  onChange={(e) => setRefineNightDrivingHalt(e.target.checked)}
                  className="rounded border-[#E6E2DC] text-[#0B6B3A] focus:ring-0 w-5 h-5 cursor-pointer"
                />
              </label>

              {/* Meal Windows: Align with lunch & dinner */}
              <label className="min-h-[44px] flex items-center justify-between cursor-pointer py-1.5 border-b border-[#E6E2DC] dark:border-[#2E302B]">
                <span className="text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2 font-medium">
                  <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Align stops with lunch (12:30-2:30 PM) &amp; dinner (7:30-9:30 PM)</span>
                </span>
                <input
                  type="checkbox"
                  checked={refinePreferMealWindows}
                  onChange={(e) => setRefinePreferMealWindows(e.target.checked)}
                  className="rounded border-[#E6E2DC] text-[#0B6B3A] focus:ring-0 w-5 h-5 cursor-pointer"
                />
              </label>

              {/* Clean Washrooms */}
              <label className="min-h-[44px] flex items-center justify-between cursor-pointer py-1.5 border-b border-[#E6E2DC] dark:border-[#2E302B]">
                <span className="text-[#1C1B1A] dark:text-[#F5F4F0] font-medium">Need clean verified washrooms</span>
                <input
                  type="checkbox"
                  checked={refineCleanWashrooms}
                  onChange={(e) => setRefineCleanWashrooms(e.target.checked)}
                  className="rounded border-[#E6E2DC] text-[#0B6B3A] focus:ring-0 w-5 h-5 cursor-pointer"
                />
              </label>

              {/* Veg food */}
              <label className="min-h-[44px] flex items-center justify-between cursor-pointer py-1.5 border-b border-[#E6E2DC] dark:border-[#2E302B]">
                <span className="text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2 font-medium">
                  <UtensilsCrossed className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
                  <span>Pure vegetarian food plazas (Shuddh Shakahari)</span>
                </span>
                <input
                  type="checkbox"
                  checked={refineVegFood}
                  onChange={(e) => setRefineVegFood(e.target.checked)}
                  className="rounded border-[#E6E2DC] text-[#0B6B3A] focus:ring-0 w-5 h-5 cursor-pointer"
                />
              </label>

              {/* Family / Women / Senior friendly */}
              <label className="min-h-[44px] flex items-center justify-between cursor-pointer py-1.5 border-b border-[#E6E2DC] dark:border-[#2E302B]">
                <span className="text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2 font-medium">
                  <ShieldAlert className="w-4 h-4 text-[#F5A524]" />
                  <span>Travelling with family/women/senior (prefer well-lit, busy stops)</span>
                </span>
                <input
                  type="checkbox"
                  checked={refineFamilyFriendly}
                  onChange={(e) => setRefineFamilyFriendly(e.target.checked)}
                  className="rounded border-[#E6E2DC] text-[#0B6B3A] focus:ring-0 w-5 h-5 cursor-pointer"
                />
              </label>

              {/* Pet friendly */}
              <label className="min-h-[44px] flex items-center justify-between cursor-pointer py-1.5">
                <span className="text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2 font-medium">
                  <Dog className="w-4 h-4 text-amber-600" />
                  <span>Pet-friendly open grounds &amp; outdoor seating</span>
                </span>
                <input
                  type="checkbox"
                  checked={refinePetFriendly}
                  onChange={(e) => setRefinePetFriendly(e.target.checked)}
                  className="rounded border-[#E6E2DC] text-[#0B6B3A] focus:ring-0 w-5 h-5 cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Submit Plan Button (≥44px touch target, 16px semibold) */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full min-h-[48px] bg-[#0B6B3A] hover:bg-[#08522C] disabled:opacity-60 text-white font-semibold text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Analyzing Indian Highway Corridors...</span>
            </>
          ) : (
            <>
              <Compass className="w-5 h-5" />
              <span>Plan my journey</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
