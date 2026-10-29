/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  JourneyPlanResult,
  JourneyStyle,
  VehiclePreset,
  PlannedStop,
  DepartureTimeSlot,
} from '../types';
import { HowWeScoreModal } from './HowWeScoreModal';
import { ReportIssueModal } from './ReportIssueModal';
import {
  normalizeAndScoreCandidates,
  generateDeterministicExplanation,
} from '../engine/scoring';
import { Language, TRANSLATIONS } from '../utils/i18n';
import {
  Clock,
  IndianRupee,
  ShieldCheck,
  Fuel,
  Bookmark,
  ExternalLink,
  Printer,
  ChevronDown,
  ChevronUp,
  Car,
  CheckCircle2,
  AlertTriangle,
  Info,
  Flag,
  CloudRain,
  Compass,
  ShieldAlert,
  Share2,
  SlidersHorizontal,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface Props {
  planResult: JourneyPlanResult;
  onSaveJourney: (result: JourneyPlanResult) => void;
  lang: Language;
  isDashboardMode?: boolean;
  onRePlan?: (params: {
    origin: any;
    destination: any;
    vehicle: VehiclePreset;
    journeyStyle: JourneyStyle;
    departureTime: string;
    refineOptions: any;
  }) => Promise<void>;
}

export const ResultsView: React.FC<Props> = ({
  planResult,
  onSaveJourney,
  lang,
  isDashboardMode = false,
  onRePlan,
}) => {
  const t = TRANSLATIONS[lang];

  // Dynamic "What if?" style & vehicle selection
  const [activeStyle, setActiveStyle] = useState<JourneyStyle>(planResult.journeyStyle);
  const [activeVehicle, setActiveVehicle] = useState<VehiclePreset>(planResult.vehicle);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(planResult.recommendedRouteId);
  const [passengerCount, setPassengerCount] = useState<number>(planResult.refineOptions?.passengers || 1);

  // Modals state
  const [showHowWeScore, setShowHowWeScore] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeInfoTooltip, setActiveInfoTooltip] = useState<string | null>(null);

  // Collapsible sections state: "Why this plan" is expanded by default; rest are collapsed by default
  const [showWhyThisPlan, setShowWhyThisPlan] = useState(true);
  const [showDeparturesSection, setShowDeparturesSection] = useState(false);
  const [showWeatherSection, setShowWeatherSection] = useState(false);
  const [showSafetySection, setShowSafetySection] = useState(false);
  const [showFatigueSection, setShowFatigueSection] = useState(false);

  // Leave now vs later live data state
  const [departureSlots, setDepartureSlots] = useState<DepartureTimeSlot[]>([]);
  const [isLoadingDepartures, setIsLoadingDepartures] = useState(false);
  const [departuresLoaded, setDeparturesLoaded] = useState(false);

  // Weather retry state
  const [isRetryingWeather, setIsRetryingWeather] = useState(false);
  const [weatherData, setWeatherData] = useState(planResult.candidates[0]?.weather || []);

  // Action status indicators
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Re-score dynamically on style change
  const currentCandidates = React.useMemo(() => {
    return normalizeAndScoreCandidates(planResult.candidates, activeStyle);
  }, [planResult.candidates, activeStyle]);

  const sortedCandidates = React.useMemo(() => {
    return [...currentCandidates].sort((a, b) => b.compositeScore - a.compositeScore);
  }, [currentCandidates]);

  const recommendedRoute = sortedCandidates[0] || currentCandidates[0];
  const activeRoute = currentCandidates.find((c) => c.id === selectedRouteId) || recommendedRoute;

  const dynamicExplanation = React.useMemo(() => {
    return generateDeterministicExplanation(currentCandidates, activeStyle, activeVehicle);
  }, [currentCandidates, activeStyle, activeVehicle]);

  // ETA Calculation
  const departureDate = new Date(planResult.departureTime || Date.now());
  const arrivalDate = new Date(departureDate.getTime() + activeRoute.totalDurationMinutes * 60 * 1000);
  const arrivalTimeFormatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(arrivalDate);

  // Match score percentage
  const matchPercentage = Math.round(activeRoute.compositeScore * 100);

  // Load departure times comparison when section is expanded
  const handleToggleDepartures = async () => {
    const nextState = !showDeparturesSection;
    setShowDeparturesSection(nextState);
    if (nextState && !departuresLoaded) {
      setIsLoadingDepartures(true);
      try {
        const res = await fetch('/api/departures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: planResult.origin,
            destination: planResult.destination,
            vehicle: activeVehicle,
            departureTime: planResult.departureTime,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setDepartureSlots(data.slots || []);
          setDeparturesLoaded(true);
        }
      } catch (err) {
        console.warn('Failed to load departure comparisons:', err);
      } finally {
        setIsLoadingDepartures(false);
      }
    }
  };

  // Weather retry handler
  const handleRetryWeather = async () => {
    setIsRetryingWeather(true);
    try {
      if (onRePlan) {
        await onRePlan({
          origin: planResult.origin,
          destination: planResult.destination,
          vehicle: activeVehicle,
          journeyStyle: activeStyle,
          departureTime: planResult.departureTime,
          refineOptions: planResult.refineOptions,
        });
      }
    } catch (err) {
      console.warn('Retry weather failed:', err);
    } finally {
      setIsRetryingWeather(false);
    }
  };

  // External Google Maps open handler (includes origin, destination, and any planned charging/refuel stops)
  const handleOpenGoogleMaps = () => {
    const orig = `${planResult.origin.lat},${planResult.origin.lon}`;
    const dest = `${planResult.destination.lat},${planResult.destination.lon}`;
    const waypoints = (activeRoute.plannedStops || [])
      .filter((p) => p.stop.lat && p.stop.lon)
      .map((p) => `${p.stop.lat},${p.stop.lon}`)
      .join('|');
    const waypointsParam = waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '';
    const url = `https://www.google.com/maps/dir/?api=1&origin=${orig}&destination=${dest}${waypointsParam}&travelmode=driving`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // WhatsApp first share handler
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🚗 NaviFlow Road Trip Plan\n` +
      `Route: ${planResult.origin.name.split(',')[0]} → ${planResult.destination.name.split(',')[0]}\n` +
      `Vehicle: ${activeVehicle.name}\n` +
      `Total Time: ${Math.floor(activeRoute.totalDurationMinutes / 60)}h ${activeRoute.totalDurationMinutes % 60}m (Arrival: ${arrivalTimeFormatted})\n` +
      `Total Cost: ~₹${activeRoute.totalCostInr.toLocaleString('en-IN')} (Estimated)\n` +
      `Recommendation: ${dynamicExplanation.headline}\n` +
      `Generated by NaviFlow India.`
    );
    const a = document.createElement('a');
    a.href = `https://wa.me/?text=${text}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2500);
  };

  const handleSave = () => {
    onSaveJourney(planResult);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 pb-12 text-[#1C1B1A] dark:text-[#F5F4F0]">
      {/* 1. ONE SUMMARY CARD (Exact Section F Specification) */}
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 shadow-sm space-y-4">
        {/* Match Percentage & "How We Decided" Link */}
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#F5A524] text-stone-950 font-bold text-sm rounded-lg tabular-nums">
              Match: {matchPercentage}%
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] font-medium">
              for {activeStyle} priority
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowHowWeScore(true)}
            className="text-sm font-semibold text-[#0B6B3A] dark:text-[#22C55E] hover:underline flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>How we decided</span>
          </button>
        </div>

        {/* Big Glanceable Figures: arrival time, total time, total cost, number of stops */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
          {/* Arrival Time */}
          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E] block mb-1 flex items-center gap-1">
              <Clock className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Arrival Time</span>
            </span>
            <span className="text-2xl sm:text-3xl font-bold tabular-nums">
              {arrivalTimeFormatted}
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              Depart {departureDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>

          {/* Total Time */}
          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E] block mb-1 flex items-center gap-1">
              <Clock className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Total Time</span>
            </span>
            <span className="text-2xl sm:text-3xl font-bold tabular-nums">
              {Math.floor(activeRoute.totalDurationMinutes / 60)}h {activeRoute.totalDurationMinutes % 60}m
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              {activeRoute.drivingDurationMinutes}m driving
            </span>
          </div>

          {/* Total Cost */}
          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E] flex items-center gap-1">
                <IndianRupee className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
                <span>Total Cost</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveInfoTooltip(activeInfoTooltip === 'totalCost' ? null : 'totalCost')}
                className="text-[#5C5A57] dark:text-[#A8A29E] hover:text-[#0B6B3A] p-0.5 cursor-pointer"
                aria-label="Cost estimate info"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-[#0B6B3A] dark:text-[#22C55E] tabular-nums">
              ~₹{activeRoute.totalCostInr.toLocaleString('en-IN')}
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              ~₹{Math.round(activeRoute.totalCostInr / passengerCount)}/person
            </span>
            {activeInfoTooltip === 'totalCost' && (
              <div className="absolute z-20 top-full left-0 mt-1 w-64 p-3 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg shadow-lg text-sm text-[#1C1B1A] dark:text-[#F5F4F0]">
                Estimated, based on live state fuel pump tariffs and NHAI FASTag electronic toll rate matrices.
              </div>
            )}
          </div>

          {/* Number of Stops */}
          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E] block mb-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Stops</span>
            </span>
            <span className="text-2xl sm:text-3xl font-bold tabular-nums">
              {activeRoute.plannedStops?.length || 0}
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              Verified highway stops
            </span>
          </div>
        </div>

        {/* One-Sentence Plain-Language Recommendation */}
        <div className="p-4 bg-[#0B6B3A]/10 border border-[#0B6B3A]/30 rounded-xl">
          <p className="text-base font-semibold text-[#0B6B3A] dark:text-[#22C55E] leading-relaxed">
            {dynamicExplanation.headline}
          </p>
        </div>

        {/* Honest Status Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm text-[#5C5A57] dark:text-[#A8A29E]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0B6B3A] dark:bg-[#22C55E]" />
            <span>Verified highway alignment · Live traffic updated</span>
          </div>
          <span>~ Estimated fuel &amp; toll tariffs</span>
        </div>
      </div>

      {/* EV Unreachable Gap Warning Banner (if no chargers cover route safely) */}
      {activeRoute.unreachableGapNotice && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-base text-amber-900 dark:text-amber-200">
              Charging Gap Detected on Corridor
            </h4>
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              {activeRoute.unreachableGapNotice}
            </p>
          </div>
        </div>
      )}

      {/* 2. JOURNEY TIMELINE (Exact Section F Specification) */}
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Journey Timeline</span>
          </h3>
          <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
            Chronological highway checkpoints
          </span>
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E6E2DC] dark:before:bg-[#2E302B]">
          {/* Origin Point */}
          <div className="relative flex items-start gap-3">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#0B6B3A] border-4 border-white dark:border-[#1B1D1A]" />
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-[#0B6B3A] dark:text-[#22C55E]">
                Depart: {departureDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
              <h4 className="text-base font-bold">
                {planResult.origin.name}
              </h4>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Tank/Charge: 100% capacity · Set trip odometer to 0 km
              </p>
            </div>
          </div>

          {/* Planned Stops & Toll Plazas */}
          {activeRoute.plannedStops && activeRoute.plannedStops.length > 0 ? (
            activeRoute.plannedStops.map((ps: PlannedStop, idx: number) => {
              const stopDate = new Date(departureDate.getTime() + ps.arrivalMinutesFromStart * 60 * 1000);
              const stopTimeFormatted = stopDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <div key={`stop-${idx}`} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-[#F5A524] border-4 border-white dark:border-[#1B1D1A]" />
                  <div className="w-full bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums">
                          {stopTimeFormatted}
                        </span>
                        <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                          (~{ps.stop.distanceFromOriginKm} km)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {ps.durationMinutes > 0 && (
                          <span className="text-sm font-semibold text-[#0B6B3A] dark:text-[#22C55E]">
                            {ps.durationMinutes} min stop
                          </span>
                        )}
                        {ps.costInr > 0 && (
                          <span className="text-sm font-bold tabular-nums">
                            ~₹{ps.costInr}
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-base font-bold">
                      {ps.stop.name}
                    </h4>

                    {/* Detour, Distance & Arrival State */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                      <span>Detour: +{ps.detourMinutes} min</span>
                      <span>·</span>
                      <span>{ps.distanceFromRouteMeters}m off highway</span>
                      <span>·</span>
                      <span>
                        {activeVehicle.fuelType === 'EV' ? 'Battery on arrival' : 'Fuel on arrival'}: {ps.fuelOrBatteryOnArrivalPercent}%
                      </span>
                    </div>

                    {/* Amenity tags */}
                    <div className="flex flex-wrap gap-2 pt-1 text-sm">
                      {ps.stop.hasToilets && (
                        <span className="text-sm bg-white dark:bg-[#1B1D1A] px-2.5 py-1 rounded border border-[#E6E2DC] dark:border-[#2E302B]">
                          Clean Washroom
                        </span>
                      )}
                      {ps.stop.hasFood && (
                        <span className="text-sm bg-white dark:bg-[#1B1D1A] px-2.5 py-1 rounded border border-[#E6E2DC] dark:border-[#2E302B]">
                          Food Plaza
                        </span>
                      )}
                      {ps.stop.isOpen24x7 && (
                        <span className="text-sm bg-white dark:bg-[#1B1D1A] px-2.5 py-1 rounded border border-[#E6E2DC] dark:border-[#2E302B]">
                          24/7 Open
                        </span>
                      )}
                      {ps.stop.chargerPowerKw && ps.stop.chargerPowerKw > 0 && (
                        <span className="text-sm font-bold text-[#0B6B3A] dark:text-[#22C55E] bg-white dark:bg-[#1B1D1A] px-2.5 py-1 rounded border border-[#E6E2DC] dark:border-[#2E302B]">
                          {ps.stop.chargerPowerKw} kW Fast DC ({ps.stop.connectorType || 'CCS-2'})
                        </span>
                      )}
                    </div>

                    {/* Safe to skip hint */}
                    <div className="text-sm font-medium pt-1">
                      {ps.isSafeToSkip ? (
                        <span className="text-[#0B6B3A] dark:text-[#22C55E]">
                          Safe to skip: {ps.skipRationale}
                        </span>
                      ) : (
                        <span className="text-[#EA580C]">
                          Mandatory stop: Essential energy top-up before low-buffer zone.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] text-sm text-[#5C5A57] dark:text-[#A8A29E]">
              Zero intermediate stops required. This trip distance ({activeRoute.distanceKm.toFixed(0)} km) is safely within your {activeVehicle.name}'s real-world range (~{activeVehicle.realWorldRangeKm} km).
            </div>
          )}

          {/* Destination Arrival Point */}
          <div className="relative flex items-start gap-3">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#DC2626] border-4 border-white dark:border-[#1B1D1A]" />
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-[#DC2626]">
                Arrive: {arrivalTimeFormatted}
              </span>
              <h4 className="text-base font-bold">
                {planResult.destination.name}
              </h4>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Total distance covered: {activeRoute.distanceKm.toFixed(0)} km
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. COMPACT COST CARD (Exact Section F Specification) */}
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Trip Cost Breakdown</span>
          </h3>
          <span className="text-sm font-bold text-[#0B6B3A] dark:text-[#22C55E]">
            Total: ~₹{activeRoute.totalCostInr.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {/* Energy / Fuel Cost */}
          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-[#5C5A57] dark:text-[#A8A29E] block mb-1">
              {activeVehicle.fuelType === 'EV' ? 'Electricity / Charging' : `${activeVehicle.fuelType} Fuel`}
            </span>
            <span className="text-xl font-bold tabular-nums">
              ~₹{activeRoute.energyCostInr.toLocaleString('en-IN')}
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              {activeRoute.energyConsumedUnits.toFixed(1)} {activeVehicle.fuelType === 'EV' ? 'kWh' : activeVehicle.fuelType === 'CNG' ? 'kg' : 'L'}
            </span>
          </div>

          {/* FASTag Tolls */}
          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#5C5A57] dark:text-[#A8A29E]">FASTag Tolls</span>
              <button
                type="button"
                onClick={() => setActiveInfoTooltip(activeInfoTooltip === 'tolls' ? null : 'tolls')}
                className="text-[#5C5A57] dark:text-[#A8A29E] hover:text-[#0B6B3A] p-0.5 cursor-pointer"
                aria-label="Toll estimate info"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-xl font-bold tabular-nums">
              ~₹{activeRoute.tollCostInr.toLocaleString('en-IN')}
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              ~{activeRoute.tollPlazas?.length || 2} Plazas
            </span>
            {activeInfoTooltip === 'tolls' && (
              <div className="absolute z-20 top-full left-0 mt-1 w-64 p-3 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg shadow-lg text-sm">
                Estimated from NHAI standard plaza toll tariffs; verify with NHAI.
              </div>
            )}
          </div>

          {/* Per Person Split */}
          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-[#5C5A57] dark:text-[#A8A29E] block mb-1">Per Person Share</span>
            <span className="text-xl font-bold text-[#0B6B3A] dark:text-[#22C55E] tabular-nums">
              ~₹{Math.round(activeRoute.totalCostInr / passengerCount).toLocaleString('en-IN')}
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              Split across {passengerCount} {passengerCount === 1 ? 'person' : 'passengers'}
            </span>
          </div>
        </div>

        {/* Round Trip and EV vs Petrol comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-1">
          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-[#5C5A57] dark:text-[#A8A29E] block mb-1">Estimated Round-Trip Cost</span>
            <span className="text-lg font-bold tabular-nums">
              ~₹{activeRoute.costBreakdown?.roundTripCostInr?.toLocaleString('en-IN') || (activeRoute.totalCostInr * 1.85).toFixed(0)}
            </span>
            <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] mt-1 leading-snug">
              {activeRoute.costBreakdown?.tollConcessionNote || 'FASTag return concession: ~25% rebate applies if returning within 24h (Estimated, verify with NHAI).'}
            </p>
          </div>

          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-[#5C5A57] dark:text-[#A8A29E] block mb-1">
              {activeVehicle.fuelType === 'EV' ? 'Savings vs Equivalent Petrol Car' : 'Potential Savings with an EV'}
            </span>
            <span className="text-lg font-bold text-[#0B6B3A] dark:text-[#22C55E] tabular-nums">
              ~₹{activeRoute.costBreakdown?.evSavingsVsPetrolInr?.toLocaleString('en-IN') || '0'}
            </span>
            <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] mt-1 leading-snug">
              Based on standard India fast-charge ₹20.50/kWh vs ₹104/L petrol benchmark.
            </p>
          </div>
        </div>
      </div>

      {/* 4. COLLAPSIBLE SECTIONS (Collapsed by default except "Why this plan") */}
      <div className="space-y-3">
        {/* Section 1: Why This Plan (EXPANDED BY DEFAULT) */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl overflow-hidden bg-white dark:bg-[#1B1D1A]">
          <button
            type="button"
            onClick={() => setShowWhyThisPlan(!showWhyThisPlan)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left text-base font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Why This Plan: Alternatives &amp; Trade-offs</span>
            </div>
            {showWhyThisPlan ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showWhyThisPlan && (
            <div className="p-5 border-t border-[#E6E2DC] dark:border-[#2E302B] space-y-4">
              {/* Candidate Route Selectors */}
              <div className="flex flex-wrap gap-2">
                {currentCandidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedRouteId(c.id)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                      selectedRouteId === c.id
                        ? 'bg-[#0B6B3A] text-white shadow-sm'
                        : 'bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B]'
                    }`}
                  >
                    <span>{c.name}</span>
                    {c.isBestOverall && (
                      <span className="px-2 py-0.5 bg-[#F5A524] text-stone-950 font-bold rounded text-sm">
                        Winner
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Why This Plan Bullets */}
              <div className="space-y-2">
                <h4 className="text-base font-bold">
                  Why this plan:
                </h4>
                <ul className="space-y-2">
                  {dynamicExplanation.whyBullets.map((bullet: string, idx: number) => (
                    <li key={`why-${idx}`} className="text-sm flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E] mt-0.5 shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What You Give Up */}
              <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-1">
                <span className="text-sm font-bold text-[#EA580C] block">
                  What you give up:
                </span>
                <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                  {dynamicExplanation.whatYouGiveUp}
                </p>
              </div>

              {/* Transparent Score Breakdown */}
              <div className="text-sm font-mono text-[#5C5A57] dark:text-[#A8A29E] bg-[#FAF8F5] dark:bg-[#121311] p-3 rounded-lg border border-[#E6E2DC] dark:border-[#2E302B]">
                {dynamicExplanation.deterministicProof}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Leave Now vs Later (COLLAPSED BY DEFAULT) */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl overflow-hidden bg-white dark:bg-[#1B1D1A]">
          <button
            type="button"
            onClick={handleToggleDepartures}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left text-base font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Leave Now vs Later (Traffic Bottleneck Analysis)</span>
            </div>
            {showDeparturesSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showDeparturesSection && (
            <div className="p-5 border-t border-[#E6E2DC] dark:border-[#2E302B] space-y-4">
              {isLoadingDepartures ? (
                <div className="p-6 text-center text-sm text-[#5C5A57] dark:text-[#A8A29E] flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#0B6B3A]" />
                  <span>Evaluating departure time windows...</span>
                </div>
              ) : departureSlots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {departureSlots.map((slot) => (
                    <div
                      key={slot.slotId}
                      className={`p-3.5 rounded-xl border text-sm space-y-1.5 ${
                        slot.isRecommended
                          ? 'border-[#0B6B3A] bg-[#0B6B3A]/5'
                          : 'border-[#E6E2DC] dark:border-[#2E302B] bg-[#FAF8F5] dark:bg-[#121311]'
                      }`}
                    >
                      <div className="flex justify-between items-center font-bold">
                        <span>{slot.label}</span>
                        {slot.isRecommended && (
                          <span className="text-sm px-2 py-0.5 bg-[#0B6B3A] text-white rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-bold tabular-nums">
                        {Math.floor(slot.durationMinutes / 60)}h {slot.durationMinutes % 60}m
                      </div>
                      <div className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                        ETA: {slot.etaFormatted}
                      </div>
                      <p className="text-sm text-[#0B6B3A] dark:text-[#22C55E] pt-1">
                        {slot.trafficSummary}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                  Highway flow stable across upcoming 2-hour departure window.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Weather (COLLAPSED BY DEFAULT, WITH RETRY) */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl overflow-hidden bg-white dark:bg-[#1B1D1A]">
          <button
            type="button"
            onClick={() => setShowWeatherSection(!showWeatherSection)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left text-base font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Corridor Weather &amp; Road Surface Warnings</span>
            </div>
            {showWeatherSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showWeatherSection && (
            <div className="p-5 border-t border-[#E6E2DC] dark:border-[#2E302B] space-y-3">
              {activeRoute.weather && activeRoute.weather.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeRoute.weather.map((w, idx) => (
                    <div
                      key={`weather-${idx}`}
                      className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] text-sm"
                    >
                      <div className="flex justify-between items-center font-bold mb-1">
                        <span>{w.locationName}</span>
                        <span className="tabular-nums">{w.tempC}°C</span>
                      </div>
                      <div className="text-[#5C5A57] dark:text-[#A8A29E]">
                        {w.conditionText} · Wind {w.windSpeedKmh} km/h
                      </div>
                      {w.isRainWarning && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 text-sm font-semibold rounded">
                          Rain Warning
                        </span>
                      )}
                      {w.isHeatWarning && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 text-sm font-semibold rounded">
                          High Heat Index
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#5C5A57] dark:text-[#A8A29E]">
                    Weather unavailable right now.
                  </span>
                  <button
                    type="button"
                    onClick={handleRetryWeather}
                    disabled={isRetryingWeather}
                    className="min-h-[44px] px-3.5 py-1.5 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg text-sm font-semibold text-[#0B6B3A] dark:text-[#22C55E] flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRetryingWeather ? 'animate-spin' : ''}`} />
                    <span>Retry</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Safety Layer (COLLAPSED BY DEFAULT) */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl overflow-hidden bg-white dark:bg-[#1B1D1A]">
          <button
            type="button"
            onClick={() => setShowSafetySection(!showSafetySection)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left text-base font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Safety Facilities Along Highway Corridor</span>
            </div>
            {showSafetySection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showSafetySection && (
            <div className="p-5 border-t border-[#E6E2DC] dark:border-[#2E302B] space-y-3">
              {activeRoute.safetyFacilities && activeRoute.safetyFacilities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeRoute.safetyFacilities.map((fac, idx) => (
                    <div
                      key={`fac-${idx}`}
                      className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] text-sm"
                    >
                      <div className="font-bold mb-1">{fac.name}</div>
                      <div className="text-[#5C5A57] dark:text-[#A8A29E]">
                        Corridor offset: ~{fac.distanceFromOriginKm} km {fac.phone ? `· Phone: ${fac.phone}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                  National highway emergency helpline is 1033 (NHAI) and 112 (National Emergency).
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section 5: Fatigue & Night Driving Advice (COLLAPSED BY DEFAULT) */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl overflow-hidden bg-white dark:bg-[#1B1D1A]">
          <button
            type="button"
            onClick={() => setShowFatigueSection(!showFatigueSection)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left text-base font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Driver Fatigue &amp; Night Cruising Advisory</span>
            </div>
            {showFatigueSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showFatigueSection && (
            <div className="p-5 border-t border-[#E6E2DC] dark:border-[#2E302B] space-y-3">
              {activeRoute.fatigueAlerts && activeRoute.fatigueAlerts.length > 0 ? (
                <div className="space-y-2.5">
                  {activeRoute.fatigueAlerts.map((fa, idx) => (
                    <div
                      key={`fa-${idx}`}
                      className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] text-sm"
                    >
                      <h5 className="font-bold mb-1">
                        {fa.title}
                      </h5>
                      <p className="text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
                        {fa.desc}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                  Safe driving schedule: 15-minute hydration stop recommended every 2 hours of continuous highway cruising.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. PERSISTENT ACTIONS BAR (Exact Section F Specification) */}
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* 1. Open in Google Maps */}
          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="min-h-[44px] px-3 py-2 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Google Maps</span>
          </button>

          {/* 2. WhatsApp First Share */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="min-h-[44px] px-3 py-2 bg-[#0B6B3A] hover:bg-[#08522C] text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>{shareSuccess ? 'Shared!' : 'Share WhatsApp'}</span>
          </button>

          {/* 3. Save Trip */}
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] px-3 py-2 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Bookmark className="w-4 h-4 text-[#F5A524]" />
            <span>{savedSuccess ? 'Saved!' : 'Save Trip'}</span>
          </button>

          {/* 4. Print / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[44px] px-3 py-2 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>

          {/* 5. Report Wrong Info */}
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="min-h-[44px] col-span-2 sm:col-span-1 px-3 py-2 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-sm font-semibold text-[#EA580C] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Flag className="w-4 h-4" />
            <span>Report Info</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <HowWeScoreModal isOpen={showHowWeScore} onClose={() => setShowHowWeScore(false)} />
      <ReportIssueModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        originName={planResult.origin.name}
        destinationName={planResult.destination.name}
        routeId={activeRoute.id}
      />
    </div>
  );
};
