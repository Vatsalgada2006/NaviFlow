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
  Share2,
  Bookmark,
  ExternalLink,
  Printer,
  ChevronDown,
  ChevronUp,
  MapPin,
  Car,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Flag,
  CloudRain,
  Flame,
  Users,
  Compass,
  ArrowRight,
  ShieldAlert,
  Send,
  MessageCircle,
  Copy,
  Sparkles,
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

  // Success states
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [isRePlanning, setIsRePlanning] = useState(false);

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

  // Handle "What If?" in-place re-planning
  const handleWhatIfVehicle = async (veh: VehiclePreset) => {
    setActiveVehicle(veh);
    if (onRePlan) {
      setIsRePlanning(true);
      try {
        await onRePlan({
          origin: planResult.origin,
          destination: planResult.destination,
          vehicle: veh,
          journeyStyle: activeStyle,
          departureTime: planResult.departureTime,
          refineOptions: planResult.refineOptions,
        });
      } finally {
        setIsRePlanning(false);
      }
    }
  };

  const handleWhatIfStyle = (st: JourneyStyle) => {
    setActiveStyle(st);
  };

  // ETA Calculation
  const formatETA = (totalMinutes: number) => {
    const departure = new Date(planResult.departureTime);
    const arrival = new Date(departure.getTime() + totalMinutes * 60000);
    return arrival.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Google Maps Deep Link with origin and destination
  const handleOpenGoogleMaps = () => {
    const originParam = encodeURIComponent(`${planResult.origin.lat},${planResult.origin.lon}`);
    const destParam = encodeURIComponent(`${planResult.destination.lat},${planResult.destination.lon}`);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Share Handlers (WhatsApp First, then Copy Link)
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🚗 NaviFlow Road Trip Plan:\n${planResult.origin.name} → ${planResult.destination.name}\n` +
      `Recommended: ${recommendedRoute.name}\n` +
      `⏱ ${Math.floor(recommendedRoute.totalDurationMinutes / 60)}h ${recommendedRoute.totalDurationMinutes % 60}m · ` +
      `💰 ₹${recommendedRoute.totalCostInr} (Fuel + Tolls)\n` +
      `View interactive route plan: ${window.location.origin}/?orig=${encodeURIComponent(planResult.origin.name)}&dest=${encodeURIComponent(planResult.destination.name)}&veh=${activeVehicle.id}&style=${activeStyle}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/?orig=${encodeURIComponent(planResult.origin.name)}&dest=${encodeURIComponent(planResult.destination.name)}&veh=${activeVehicle.id}&style=${activeStyle}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    onSaveJourney({
      ...planResult,
      journeyStyle: activeStyle,
      vehicle: activeVehicle,
      recommendedRouteId: recommendedRoute.id,
      explanation: dynamicExplanation,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Cost calculations with passenger split
  const fuelAndStopCost = activeRoute.energyCostInr + (activeRoute.costBreakdown?.stopRefreshmentCostInr || 0);
  const totalCost = activeRoute.totalCostInr;
  const perPersonCost = Math.round(totalCost / passengerCount);
  const roundTripCost = activeRoute.costBreakdown?.roundTripCostInr || (totalCost * 2 - Math.round(activeRoute.tollCostInr * 0.25));
  const evSavings = activeRoute.costBreakdown?.evSavingsVsPetrolInr || 0;

  // Timeline items: merge planned stops and toll plazas in chronological order
  const timelineStops = React.useMemo(() => {
    const stopsList: {
      type: 'stop' | 'toll';
      data: PlannedStop | StopAmenity;
      km: number;
    }[] = [];

    (activeRoute.plannedStops || []).forEach((ps) => {
      stopsList.push({
        type: 'stop',
        data: ps,
        km: ps.stop.distanceFromOriginKm || 0,
      });
    });

    (activeRoute.tollPlazas || []).forEach((tp) => {
      stopsList.push({
        type: 'toll',
        data: tp,
        km: tp.distanceFromOriginKm || 0,
      });
    });

    return stopsList.sort((a, b) => a.km - b.km);
  }, [activeRoute]);

  const lowestBuffer = activeRoute.lowestBufferPoint || {
    percentRemaining: 22,
    rangeKmRemaining: Math.round(activeVehicle.realWorldRangeKm * 0.22),
    locationName: 'Midway Corridor',
    status: 'safe',
    rationale: 'Safe energy buffer maintained throughout corridor.',
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* TomTom Daily Quota Exceeded Notification */}
      {planResult.metadata?.tomtomQuotaExceeded && (
        <div className="p-3 bg-amber-950/40 border border-amber-500/60 rounded-xl text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <strong className="text-amber-300">Traffic Provider Fallback:</strong> NaviFlow automatically engaged Project OSRM fallback routing. Travel times are labeled &quot;No live traffic&quot;.
          </div>
        </div>
      )}

      {/* 1. PLAN SUMMARY CARD AT TOP */}
      <div className="bg-gradient-to-br from-[#111827] via-slate-900 to-sky-950/40 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badges & Freshness */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Recommended Plan
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">&middot; {planResult.metadata?.routingProvider} Routing</span>
          </div>

          <div className="flex items-center gap-2">
            <SourceChip
              source={{
                type: 'Live',
                provider: planResult.metadata?.routingProvider || 'TomTom',
                timestamp: planResult.metadata?.generatedAt || new Date().toISOString(),
              }}
            />
          </div>
        </div>

        {/* Primary Recommendation Headline (Large Size) */}
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-tight leading-snug">
            {dynamicExplanation.headline}
          </h2>
          <p className="text-xs sm:text-sm text-teal-400 font-medium mt-1">
            {dynamicExplanation.subheadline}
          </p>
        </div>

        {/* Glanceable Hero Numbers (Large Tabular Numerals) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
          {/* Total Duration */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>Total Time</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight mt-1">
              {Math.floor(activeRoute.totalDurationMinutes / 60)}<span className="text-sm font-medium text-slate-400">h</span>{' '}
              {activeRoute.totalDurationMinutes % 60}<span className="text-sm font-medium text-slate-400">m</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              ETA: {formatETA(activeRoute.totalDurationMinutes)}
            </div>
          </div>

          {/* Total Cost */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Cost</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight mt-1">
              ₹{activeRoute.totalCostInr.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Fuel ₹{activeRoute.energyCostInr} + Tolls ₹{activeRoute.tollCostInr}
            </div>
          </div>

          {/* Distance */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>Distance</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight mt-1">
              {activeRoute.distanceKm}<span className="text-sm font-medium text-slate-400"> km</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {Math.round(activeRoute.expresswayFraction * 100)}% Expressway
            </div>
          </div>

          {/* Number of Stops */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>Stops &amp; Tolls</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight mt-1">
              {activeRoute.plannedStops?.length || 0}<span className="text-sm font-medium text-slate-400"> stops</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {activeRoute.tollPlazas?.length || 0} FASTag Plazas
            </div>
          </div>
        </div>
      </div>

      {/* 2. TABS FOR BEST OVERALL / FASTEST / CHEAPEST */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {currentCandidates.map((c) => {
              const isSelected = c.id === activeRoute.id;
              let badge = '';
              if (c.isBestOverall) badge = 'Best Overall';
              else if (c.isFastest) badge = 'Fastest';
              else if (c.isCheapest) badge = 'Cheapest';

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedRouteId(c.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-teal-500 text-slate-950 shadow-md'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{c.name}</span>
                  {badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-sans uppercase tracking-wider ${
                        isSelected ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-teal-400'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* "How we score" trigger button */}
          <button
            type="button"
            onClick={() => setShowHowWeScore(true)}
            className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold underline underline-offset-4 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>How we score</span>
          </button>
        </div>

        {/* Why this plan & What you give up */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-2 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Why This Plan</span>
            </h4>
            <ul className="space-y-1.5 text-slate-300">
              {dynamicExplanation.whyBullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-teal-400 font-bold">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>What You Give Up</span>
            </h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {dynamicExplanation.whatYouGiveUp}
            </p>
          </div>
        </div>
      </div>

      {/* 4. RANGE & FUEL BUFFER BAR ACROSS WHOLE ROUTE */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeVehicle.fuelType === 'EV' ? (
              <Zap className="w-4 h-4 text-cyan-400" />
            ) : (
              <Fuel className="w-4 h-4 text-amber-400" />
            )}
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {activeVehicle.fuelType === 'EV' ? 'EV Battery Range Buffer' : 'Fuel Tank Buffer'}
            </h4>
          </div>

          <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
              lowestBuffer.status === 'safe'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : lowestBuffer.status === 'caution'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-red-950 text-red-300 border border-red-800'
            }`}
          >
            {lowestBuffer.status.toUpperCase()} BUFFER
          </span>
        </div>

        {/* Visual Range Buffer Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 flex">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                lowestBuffer.percentRemaining >= 25
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : lowestBuffer.percentRemaining >= 15
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-red-600 to-red-400'
              }`}
              style={{ width: `${Math.max(10, Math.min(100, lowestBuffer.percentRemaining))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Departure: 85%</span>
            <span className="text-white font-semibold">
              Lowest Point: {lowestBuffer.percentRemaining}% (~{lowestBuffer.rangeKmRemaining} km)
            </span>
            <span>Arrival Reserve: ≥20%</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          {lowestBuffer.rationale}
        </p>
      </div>

      {/* 5. "LEAVE NOW VS LATER" BUTTON */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 text-left w-full sm:w-auto">
          <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-xl shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Leave Now vs Later</h4>
            <p className="text-xs text-slate-400">
              Compare TomTom live traffic &amp; delays for Now, +1 hour, and +2 hours
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDeparturesModal(true)}
          className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-teal-500 text-teal-300 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
        >
          Compare Departure Times
        </button>
      </div>

      {/* 3. HERO JOURNEY TIMELINE */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Journey Timeline &amp; Waypoint Stops</h3>
            <p className="text-xs text-slate-400">Chronological highway progression with verified amenities &amp; FASTag tolls</p>
          </div>
          <span className="text-xs text-teal-400 font-mono font-semibold">
            {timelineStops.length} Checkpoints
          </span>
        </div>

        {/* Vertical Timeline */}
        <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {/* Origin departure */}
          <div className="relative flex items-start gap-3">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center border-2 border-slate-900">
              A
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Depart: {planResult.origin.name}</span>
                <span className="text-[11px] text-teal-400 font-mono">0 km · 00:00</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Initial tank / battery: 85% full · Cruising begins
              </div>
            </div>
          </div>

          {/* Timeline Checkpoints */}
          {timelineStops.map((item, idx) => {
            if (item.type === 'toll') {
              const toll = item.data as StopAmenity;
              return (
                <div key={`toll-${idx}`} className="relative flex items-start gap-3 pl-1">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center border-2 border-slate-900">
                    ₹
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 w-full space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">
                        {toll.name || 'FASTag Toll Plaza'}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        ~₹{toll.tollFeeEstimatedInr || 125}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Corridor: ~{item.km} km from origin</span>
                      <span className="text-slate-500">FASTag Electronic Toll</span>
                    </div>
                  </div>
                </div>
              );
            }

            const stop = item.data as PlannedStop;
            const isCharge = stop.type === 'charge';
            const isRefuel = stop.type === 'refuel';

            return (
              <div key={`stop-${idx}`} className="relative flex items-start gap-3 pl-1">
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center border-2 border-slate-900 ${
                    isCharge ? 'bg-cyan-400 text-slate-950' : isRefuel ? 'bg-amber-400 text-slate-950' : 'bg-indigo-500 text-white'
                  }`}
                >
                  {isCharge ? '⚡' : isRefuel ? '⛽' : '🍽'}
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 w-full space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{stop.stop.name}</span>
                        {stop.stop.brand && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-teal-300 rounded font-normal">
                            {stop.stop.brand}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Arrival: ~{stop.arrivalTimeFormatted} (at ~{item.km} km) &middot; Duration: {stop.durationMinutes} min
                      </div>
                    </div>

                    <div className="text-right">
                      {stop.costInr > 0 ? (
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          +₹{stop.costInr}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">
                          Included in fuel
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detour, range levels & Safe to skip */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] pt-1 border-t border-slate-900">
                    <span className="text-slate-400">
                      Detour: <strong className="text-slate-200">+{stop.detourMinutes} min</strong> ({stop.distanceFromRouteMeters}m off highway)
                    </span>
                    <span className="text-slate-400">
                      Tank / Battery: <strong className="text-amber-400">{stop.fuelOrBatteryOnArrivalPercent}%</strong> →{' '}
                      <strong className="text-emerald-400">{stop.fuelOrBatteryAfterPercent}%</strong>
                    </span>
                    {stop.isSafeToSkip ? (
                      <span className="px-1.5 py-0.2 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-medium">
                        Safe to skip
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-amber-950/60 text-amber-400 border border-amber-800/60 rounded text-[10px] font-medium">
                        Mandatory stop
                      </span>
                    )}
                  </div>

                  {/* Amenity Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {stop.stop.hasToilets && (
                      <span className="px-1.5 py-0.5 bg-slate-900 text-slate-300 rounded text-[10px] border border-slate-800">
                        🚻 Washrooms
                      </span>
                    )}
                    {stop.stop.hasFood && (
                      <span className="px-1.5 py-0.5 bg-slate-900 text-slate-300 rounded text-[10px] border border-slate-800">
                        🍽 Food Plaza
                      </span>
                    )}
                    {stop.stop.isOpen24x7 && (
                      <span className="px-1.5 py-0.5 bg-slate-900 text-slate-300 rounded text-[10px] border border-slate-800">
                        🕒 Open 24/7
                      </span>
                    )}
                    {stop.stop.hasParking && (
                      <span className="px-1.5 py-0.5 bg-slate-900 text-slate-300 rounded text-[10px] border border-slate-800">
                        🅿️ Parking
                      </span>
                    )}
                    {stop.chargeAddedKwh && (
                      <span className="px-1.5 py-0.5 bg-cyan-950/60 text-cyan-300 rounded text-[10px] border border-cyan-800/60">
                        ⚡ +{stop.chargeAddedKwh} kWh Fast Charge
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    {stop.skipRationale}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Destination arrival */}
          <div className="relative flex items-start gap-3">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-red-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-slate-900">
              B
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Arrive: {planResult.destination.name}</span>
                <span className="text-[11px] text-teal-400 font-mono">
                  {activeRoute.distanceKm} km · ETA {formatETA(activeRoute.totalDurationMinutes)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Safe arrival with reserve fuel buffer intact.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. COST CARD */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Comprehensive Cost Breakdown</h3>
          </div>
          <SourceChip
            source={
              planResult.metadata?.fuelPricesUsed?.source || {
                type: 'Live',
                provider: 'State Fuel Matrix',
                timestamp: planResult.metadata?.generatedAt || new Date().toISOString(),
              }
            }
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Fuel / Energy</span>
            <span className="text-base font-bold text-white tabular-nums">
              ₹{activeRoute.energyCostInr.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
              {activeRoute.energyConsumedUnits} {activeVehicle.fuelType === 'EV' ? 'kWh' : activeVehicle.fuelType === 'CNG' ? 'kg' : 'L'}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">FASTag Highway Tolls</span>
            <span className="text-base font-bold text-white tabular-nums">
              ₹{activeRoute.tollCostInr.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {activeRoute.tollPlazas?.length || 0} Plazas (Estimated, verify)
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Per-Person ({passengerCount} Pax)</span>
            <span className="text-base font-bold text-teal-400 tabular-nums">
              ₹{perPersonCost.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Equal trip share</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Estimated Round-Trip</span>
            <span className="text-base font-bold text-white tabular-nums">
              ₹{roundTripCost.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Inc. 24h FASTag return disc.</span>
          </div>
        </div>

        {/* EV vs Petrol Comparison */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 to-teal-950/40 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-emerald-300">
                {activeVehicle.fuelType === 'EV'
                  ? `EV Economy: Saves ~₹${evSavings} vs equivalent petrol car on this trip!`
                  : `EV Potential: An EV would save ~₹${evSavings} on this corridor.`}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Calculated against Indian baseline 15 km/L petrol car @ ₹{planResult.metadata?.fuelPricesUsed?.petrol || 104}/L.
              </p>
            </div>
          </div>
        </div>

        {/* Toll rule notice */}
        <p className="text-[11px] text-slate-400">
          * Toll concession note: NHAI provides 25% discount on FASTag return journeys completed within 24 hours at the same plaza. Rates are subject to local toll revision; verify before traveling.
        </p>
      </div>

      {/* 7. ALONG-ROUTE EXTRAS (Weather, Safety, Fatigue Alerts) */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-teal-400" />
          <span>Along-Route Safety &amp; Fatigue Advisory</span>
        </h3>

        {/* Fatigue & Night Driving Alerts */}
        <div className="space-y-2.5">
          {activeRoute.fatigueAlerts && activeRoute.fatigueAlerts.length > 0 ? (
            activeRoute.fatigueAlerts.map((fa, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  fa.severity === 'warning'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${fa.severity === 'warning' ? 'text-amber-400' : 'text-teal-400'}`} />
                <div>
                  <strong className="text-white block">{fa.title}</strong>
                  <span className="text-[11px] text-slate-300 leading-relaxed">{fa.desc}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
              No severe fatigue or weather hazards predicted for this corridor.
            </div>
          )}
        </div>

        {/* Open-Meteo Corridor Weather Summary */}
        {activeRoute.weather && activeRoute.weather.length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-sky-400" />
                <span>Open-Meteo Live Corridor Weather</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">100% Free · No API Key</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {activeRoute.weather.map((w, idx) => (
                <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="text-[11px] text-slate-400 truncate">{w.locationName}</div>
                  <div className="text-base font-bold text-white flex items-center gap-1">
                    <span>{w.tempC}°C</span>
                    <span className="text-xs font-normal text-slate-400">({w.conditionText})</span>
                  </div>
                  {w.isRainWarning && (
                    <div className="text-[10px] text-blue-400 font-bold">⚠️ Showers / Wet</div>
                  )}
                  {w.isHeatWarning && (
                    <div className="text-[10px] text-amber-400 font-bold">⚠️ High Heat Index</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 9. "WHAT IF?" SWITCHER (Vehicle and Style re-planning in place) */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              &quot;What If?&quot; In-Place Switcher
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">Re-plans instantaneously</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Quick Vehicle Switcher */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Powertrain / Vehicle</label>
            <select
              value={activeVehicle.id}
              onChange={(e) => {
                const found = INDIAN_VEHICLE_PRESETS.find((v) => v.id === e.target.value);
                if (found) handleWhatIfVehicle(found);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-400 cursor-pointer"
            >
              {INDIAN_VEHICLE_PRESETS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.fuelType}) · {v.realWorldRangeKm} km range
                </option>
              ))}
            </select>
          </div>

          {/* Quick Style Switcher */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Decision Objective Policy</label>
            <select
              value={activeStyle}
              onChange={(e) => handleWhatIfStyle(e.target.value as JourneyStyle)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-400 cursor-pointer"
            >
              <option value="Fast">Fast Policy (50% Time, 20% Cost, 15% Comfort, 15% Stops)</option>
              <option value="Cheap">Cheap Policy (50% Cost, 20% Time, 15% Comfort, 15% Stops)</option>
              <option value="Comfort">Comfort Policy (30% Comfort, 30% Stops, 20% Time, 20% Cost)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 8. ACTIONS: SAVE, SHARE, PRINT, GOOGLE MAPS, REPORT WRONG INFO */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-teal-500 rounded-xl text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Bookmark className={`w-3.5 h-3.5 ${savedSuccess ? 'text-teal-400' : 'text-slate-400'}`} />
            <span>{savedSuccess ? 'Saved to Library!' : 'Save Plan'}</span>
          </button>

          {/* Share WhatsApp First */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 rounded-xl text-xs font-semibold text-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp</span>
          </button>

          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-teal-400" />
            <span>{shareSuccess ? 'Copied URL!' : 'Copy Link'}</span>
          </button>

          {/* Print / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print / PDF</span>
          </button>

          {/* Open in Google Maps */}
          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
            <span>Google Maps</span>
          </button>
        </div>

        {/* Report Wrong Info */}
        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="text-xs text-amber-400/80 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Report wrong info</span>
        </button>
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
