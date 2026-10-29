/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  JourneyPlanResult,
  RouteCandidate,
  JourneyStyle,
  VehiclePreset,
  StopAmenity,
  PlannedStop,
} from '../types';
import { SourceChip } from './SourceChip';
import { HowWeScoreModal } from './HowWeScoreModal';
import { ReportIssueModal } from './ReportIssueModal';
import { DepartureComparisonModal } from './DepartureComparisonModal';
import {
  normalizeAndScoreCandidates,
  generateDeterministicExplanation,
  calculateCostBreakdown,
  generateFatigueAlerts,
  SCORING_WEIGHTS,
} from '../engine/scoring';
import { INDIAN_VEHICLE_PRESETS } from '../engine/vehicles';
import { Language, TRANSLATIONS } from '../utils/i18n';
import {
  Clock,
  IndianRupee,
  ShieldCheck,
  Zap,
  Fuel,
  Bookmark,
  ExternalLink,
  Printer,
  ChevronDown,
  ChevronUp,
  MapPin,
  Car,
  CheckCircle2,
  AlertTriangle,
  Info,
  Flag,
  CloudRain,
  Flame,
  Users,
  Compass,
  ArrowRight,
  ShieldAlert,
  Share2,
  Copy,
  SlidersHorizontal,
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

  // Dynamic "What if?" state
  const [activeStyle, setActiveStyle] = useState<JourneyStyle>(planResult.journeyStyle);
  const [activeVehicle, setActiveVehicle] = useState<VehiclePreset>(planResult.vehicle);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(planResult.recommendedRouteId);
  const [passengerCount, setPassengerCount] = useState<number>(planResult.refineOptions?.passengers || 1);

  // Modals state
  const [showHowWeScore, setShowHowWeScore] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeparturesModal, setShowDeparturesModal] = useState(false);

  // Collapsible sections state (collapsed by default)
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showBufferBar, setShowBufferBar] = useState(false);
  const [showWeatherSection, setShowWeatherSection] = useState(false);
  const [showSafetySection, setShowSafetySection] = useState(false);
  const [showFatigueSection, setShowFatigueSection] = useState(false);

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

  // External Google Maps open handler
  const handleOpenGoogleMaps = () => {
    const orig = `${planResult.origin.lat},${planResult.origin.lon}`;
    const dest = `${planResult.destination.lat},${planResult.destination.lon}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${orig}&destination=${dest}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // WhatsApp first share handler (prefilled with arrival time, route, and cost)
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🚗 NaviFlow Road Trip Plan\n` +
      `Route: ${planResult.origin.name.split(',')[0]} → ${planResult.destination.name.split(',')[0]}\n` +
      `Vehicle: ${activeVehicle.name}\n` +
      `Total Time: ${Math.floor(activeRoute.totalDurationMinutes / 60)}h ${activeRoute.totalDurationMinutes % 60}m (Arrival: ${arrivalTimeFormatted})\n` +
      `Total Cost: ₹${activeRoute.totalCostInr.toLocaleString('en-IN')} (Fuel: ₹${activeRoute.energyCostInr}, Tolls: ₹${activeRoute.tollCostInr})\n` +
      `Recommendation: ${dynamicExplanation.headline}\n` +
      `Generated by NaviFlow India.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2500);
  };

  // Save journey handler
  const handleSave = () => {
    onSaveJourney(planResult);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 pb-12">
      {/* 1. PLAN SUMMARY CARD (Hero summary at the very top) */}
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
            <Info className="w-4 h-4" />
            <span>How we decided</span>
          </button>
        </div>

        {/* Big Glanceable Figures */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E] block mb-1 flex items-center gap-1">
              <Clock className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Total Time</span>
            </span>
            <span className="text-2xl font-bold text-[#1C1B1A] dark:text-[#F5F4F0] tabular-nums">
              {Math.floor(activeRoute.totalDurationMinutes / 60)}h {activeRoute.totalDurationMinutes % 60}m
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              ETA: {arrivalTimeFormatted}
            </span>
          </div>

          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E] block mb-1 flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Total Cost</span>
            </span>
            <span className="text-2xl font-bold text-[#0B6B3A] dark:text-[#22C55E] tabular-nums">
              ₹{activeRoute.totalCostInr.toLocaleString('en-IN')}
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              ₹{Math.round(activeRoute.totalCostInr / passengerCount)}/person
            </span>
          </div>

          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E] block mb-1 flex items-center gap-1">
              <Compass className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Distance</span>
            </span>
            <span className="text-2xl font-bold text-[#1C1B1A] dark:text-[#F5F4F0] tabular-nums">
              {activeRoute.distanceKm.toFixed(0)} km
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              {Math.round(activeRoute.expresswayFraction * 100)}% expressway
            </span>
          </div>

          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E] block mb-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Planned Stops</span>
            </span>
            <span className="text-2xl font-bold text-[#1C1B1A] dark:text-[#F5F4F0] tabular-nums">
              {activeRoute.plannedStops?.length || 0}
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              Verified facilities
            </span>
          </div>
        </div>

        {/* One-Sentence Recommendation */}
        <div className="p-4 bg-[#0B6B3A]/10 border border-[#0B6B3A]/30 rounded-xl">
          <p className="text-base font-semibold text-[#0B6B3A] dark:text-[#22C55E] leading-relaxed">
            {dynamicExplanation.headline}
          </p>
        </div>

        {/* Freshness & Confidence Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm text-[#5C5A57] dark:text-[#A8A29E]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0B6B3A] dark:bg-[#22C55E]" />
            <span>High confidence: verified national highway alignment</span>
          </div>
          <div className="flex items-center gap-2">
            <SourceChip source={activeRoute.tollSource} label="Toll" />
            <SourceChip source={activeRoute.energySource} label="Fuel" />
          </div>
        </div>
      </div>

      {/* 2. JOURNEY TIMELINE (Hero component) */}
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
          <h3 className="text-lg font-bold text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2">
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
              <h4 className="text-base font-bold text-[#1C1B1A] dark:text-[#F5F4F0]">
                {planResult.origin.name}
              </h4>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Tank/Charge: 100% capacity · Set odometer to 0 km
              </p>
            </div>
          </div>

          {/* Planned Stops & Toll Plazas */}
          {activeRoute.plannedStops && activeRoute.plannedStops.length > 0 ? (
            activeRoute.plannedStops.map((ps, idx) => {
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
                        <span className="text-sm font-bold text-[#1C1B1A] dark:text-[#F5F4F0] tabular-nums">
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
                          <span className="text-sm font-bold text-[#1C1B1A] dark:text-[#F5F4F0] tabular-nums">
                            ₹{ps.costInr}
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-[#1C1B1A] dark:text-[#F5F4F0]">
                      {ps.stop.name}
                    </h4>

                    {/* Detour & Distance info */}
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
                        <span className="text-sm text-[#1C1B1A] dark:text-[#F5F4F0] bg-white dark:bg-[#1B1D1A] px-2.5 py-1 rounded border border-[#E6E2DC] dark:border-[#2E302B]">
                          Clean Washroom
                        </span>
                      )}
                      {ps.stop.hasFood && (
                        <span className="text-sm text-[#1C1B1A] dark:text-[#F5F4F0] bg-white dark:bg-[#1B1D1A] px-2.5 py-1 rounded border border-[#E6E2DC] dark:border-[#2E302B]">
                          Food Plaza
                        </span>
                      )}
                      {ps.stop.isOpen24x7 && (
                        <span className="text-sm text-[#1C1B1A] dark:text-[#F5F4F0] bg-white dark:bg-[#1B1D1A] px-2.5 py-1 rounded border border-[#E6E2DC] dark:border-[#2E302B]">
                          24/7 Open
                        </span>
                      )}
                      {ps.stop.chargerPowerKw && ps.stop.chargerPowerKw > 0 && (
                        <span className="text-sm font-bold text-[#0B6B3A] dark:text-[#22C55E] bg-white dark:bg-[#1B1D1A] px-2.5 py-1 rounded border border-[#E6E2DC] dark:border-[#2E302B]">
                          {ps.stop.chargerPowerKw} kW Fast DC
                        </span>
                      )}
                    </div>

                    {/* Safe to skip hint */}
                    <div className="text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E] pt-1">
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
              Zero intermediate stops scheduled. This corridor distance ({activeRoute.distanceKm.toFixed(0)} km) is safely within your {activeVehicle.name}'s real-world range (~{activeVehicle.realWorldRangeKm} km).
            </div>
          )}

          {/* Destination Point */}
          <div className="relative flex items-start gap-3">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#DC2626] border-4 border-white dark:border-[#1B1D1A]" />
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-[#DC2626]">
                Arrive: {arrivalTimeFormatted}
              </span>
              <h4 className="text-base font-bold text-[#1C1B1A] dark:text-[#F5F4F0]">
                {planResult.destination.name}
              </h4>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Total distance covered: {activeRoute.distanceKm.toFixed(0)} km
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. COMPACT COST CARD */}
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
          <h3 className="text-lg font-bold text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Trip Cost Breakdown</span>
          </h3>
          <span className="text-sm font-bold text-[#0B6B3A] dark:text-[#22C55E]">
            Total: ₹{activeRoute.totalCostInr.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-[#5C5A57] dark:text-[#A8A29E] block mb-1">
              {activeVehicle.fuelType === 'EV' ? 'Electricity / Fast Charging' : `${activeVehicle.fuelType} Fuel`}
            </span>
            <span className="text-xl font-bold text-[#1C1B1A] dark:text-[#F5F4F0] tabular-nums">
              ₹{activeRoute.energyCostInr.toLocaleString('en-IN')}
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              {activeRoute.energyConsumedUnits.toFixed(1)} {activeVehicle.fuelType === 'EV' ? 'kWh' : activeVehicle.fuelType === 'CNG' ? 'kg' : 'L'}
            </span>
          </div>

          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-[#5C5A57] dark:text-[#A8A29E] block mb-1">FASTag Highway Tolls</span>
            <span className="text-xl font-bold text-[#1C1B1A] dark:text-[#F5F4F0] tabular-nums">
              ₹{activeRoute.tollCostInr.toLocaleString('en-IN')}
            </span>
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] block mt-0.5">
              ~{activeRoute.tollPlazas?.length || 2} Plazas
            </span>
          </div>

          <div className="p-3 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
            <span className="text-[#5C5A57] dark:text-[#A8A29E] block mb-1">Per Person Share</span>
            <span className="text-xl font-bold text-[#0B6B3A] dark:text-[#22C55E] tabular-nums">
              ₹{Math.round(activeRoute.totalCostInr / passengerCount).toLocaleString('en-IN')}
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
            <span className="text-lg font-bold text-[#1C1B1A] dark:text-[#F5F4F0] tabular-nums">
              ₹{activeRoute.costBreakdown?.roundTripCostInr?.toLocaleString('en-IN') || (activeRoute.totalCostInr * 1.85).toFixed(0)}
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
              ₹{activeRoute.costBreakdown?.evSavingsVsPetrolInr?.toLocaleString('en-IN') || '0'}
            </span>
            <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] mt-1 leading-snug">
              Based on standard India fast-charge ₹20.50/kWh vs ₹104/L petrol benchmark.
            </p>
          </div>
        </div>
      </div>

      {/* 4. COLLAPSIBLE SECTIONS (Progressive disclosure, collapsed by default) */}
      <div className="space-y-3">
        {/* Collapsible 1: Route Alternatives & Trade-offs */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl overflow-hidden bg-white dark:bg-[#1B1D1A]">
          <button
            type="button"
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left text-base font-bold text-[#1C1B1A] dark:text-[#F5F4F0] hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Route Alternatives &amp; Why This Won</span>
            </div>
            {showAlternatives ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showAlternatives && (
            <div className="p-5 border-t border-[#E6E2DC] dark:border-[#2E302B] space-y-4">
              {/* Tabs for Candidates */}
              <div className="flex flex-wrap gap-2">
                {currentCandidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedRouteId(c.id)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                      selectedRouteId === c.id
                        ? 'bg-[#0B6B3A] text-white shadow-sm'
                        : 'bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] text-[#1C1B1A] dark:text-[#F5F4F0]'
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
                <h4 className="text-base font-bold text-[#1C1B1A] dark:text-[#F5F4F0]">
                  Why this plan:
                </h4>
                <ul className="space-y-2">
                  {dynamicExplanation.whyBullets.map((bullet, idx) => (
                    <li key={`why-${idx}`} className="text-sm text-[#1C1B1A] dark:text-[#F5F4F0] flex items-start gap-2.5">
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

              {/* Engine Score Breakdown */}
              <div className="text-sm font-mono text-[#5C5A57] dark:text-[#A8A29E] bg-[#FAF8F5] dark:bg-[#121311] p-3 rounded-lg border border-[#E6E2DC] dark:border-[#2E302B]">
                {dynamicExplanation.deterministicProof}
              </div>
            </div>
          )}
        </div>

        {/* Collapsible 2: Range & Fuel Buffer Bar */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl overflow-hidden bg-white dark:bg-[#1B1D1A]">
          <button
            type="button"
            onClick={() => setShowBufferBar(!showBufferBar)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left text-base font-bold text-[#1C1B1A] dark:text-[#F5F4F0] hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Fuel className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Range &amp; Energy Buffer Across Route</span>
            </div>
            {showBufferBar ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showBufferBar && (
            <div className="p-5 border-t border-[#E6E2DC] dark:border-[#2E302B] space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Lowest Range Margin Along Journey</span>
                  <span className="font-bold text-[#0B6B3A] dark:text-[#22C55E] tabular-nums">
                    {activeRoute.lowestBufferPoint?.percentRemaining || 25}% remaining
                  </span>
                </div>
                <div className="w-full h-3 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0B6B3A] dark:bg-[#22C55E] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, activeRoute.lowestBufferPoint?.percentRemaining || 25)}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                {activeRoute.lowestBufferPoint?.rationale || 'Vehicle maintains safe fuel reserve throughout national highway alignment.'}
              </p>
            </div>
          )}
        </div>

        {/* Collapsible 3: Weather Radar */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl overflow-hidden bg-white dark:bg-[#1B1D1A]">
          <button
            type="button"
            onClick={() => setShowWeatherSection(!showWeatherSection)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left text-base font-bold text-[#1C1B1A] dark:text-[#F5F4F0] hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
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
                <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                  Weather radar temporarily unavailable for this alignment. Highway cruising conditions standard.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Collapsible 4: Emergency & Safety Facilities */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl overflow-hidden bg-white dark:bg-[#1B1D1A]">
          <button
            type="button"
            onClick={() => setShowSafetySection(!showSafetySection)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left text-base font-bold text-[#1C1B1A] dark:text-[#F5F4F0] hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
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

        {/* Collapsible 5: Driver Fatigue & Night Driving Schedule */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl overflow-hidden bg-white dark:bg-[#1B1D1A]">
          <button
            type="button"
            onClick={() => setShowFatigueSection(!showFatigueSection)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left text-base font-bold text-[#1C1B1A] dark:text-[#F5F4F0] hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
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
                      <h5 className="font-bold text-[#1C1B1A] dark:text-[#F5F4F0] mb-1">
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
                  Safe driving schedule: 15-minute hydration stop recommended every 2 hours of continuous expressway driving.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* "Leave Now vs Later" Action Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowDeparturesModal(true)}
          className="w-full min-h-[48px] py-3 px-4 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#0B6B3A] text-[#0B6B3A] dark:text-[#22C55E] rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <Clock className="w-5 h-5" />
          <span>Compare Leave Now vs Later (Traffic Bottleneck Analysis)</span>
        </button>
      </div>

      {/* 5. PERSISTENT ACTIONS BAR */}
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* 1. Open Google Maps */}
          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="min-h-[44px] px-3 py-2 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Google Maps</span>
          </button>

          {/* 2. WhatsApp First Share */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="min-h-[44px] px-3 py-2 bg-[#0B6B3A] hover:bg-[#08522C] text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{shareSuccess ? 'Shared!' : 'Share WhatsApp'}</span>
          </button>

          {/* 3. Save Trip */}
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] px-3 py-2 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Bookmark className="w-4 h-4 text-[#F5A524]" />
            <span>{savedSuccess ? 'Saved!' : 'Save Trip'}</span>
          </button>

          {/* 4. Print / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[44px] px-3 py-2 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-sm font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF</span>
          </button>

          {/* 5. Report Issue */}
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
      <DepartureComparisonModal
        isOpen={showDeparturesModal}
        onClose={() => setShowDeparturesModal(false)}
        origin={planResult.origin}
        destination={planResult.destination}
        vehicle={activeVehicle}
        currentDepartureTime={planResult.departureTime}
      />
    </div>
  );
};
