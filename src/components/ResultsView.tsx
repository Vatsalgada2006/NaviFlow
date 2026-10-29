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
} from '../types';
import { LeafletMap } from './LeafletMap';
import { SourceChip } from './SourceChip';
import {
  normalizeAndScoreCandidates,
  generateDeterministicExplanation,
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
} from 'lucide-react';

interface Props {
  planResult: JourneyPlanResult;
  onSaveJourney: (result: JourneyPlanResult) => void;
  lang: Language;
  isDashboardMode?: boolean;
}

export const ResultsView: React.FC<Props> = ({
  planResult,
  onSaveJourney,
  lang,
  isDashboardMode = false,
}) => {
  const t = TRANSLATIONS[lang];

  // Dynamic "What if?" state
  const [activeStyle, setActiveStyle] = useState<JourneyStyle>(planResult.journeyStyle);
  const [activeVehicle, setActiveVehicle] = useState<VehiclePreset>(planResult.vehicle);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(planResult.recommendedRouteId);
  const [showProof, setShowProof] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Re-score dynamically on style or vehicle change
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

  // Google Maps Deep Link
  const handleOpenGoogleMaps = () => {
    const originParam = encodeURIComponent(`${planResult.origin.lat},${planResult.origin.lon}`);
    const destParam = encodeURIComponent(`${planResult.destination.lat},${planResult.destination.lon}`);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Share Link Handler
  const handleShareLink = () => {
    const shareData = {
      title: 'NaviFlow Journey Plan',
      text: `${planResult.origin.name} to ${planResult.destination.name} - Recommended: ${recommendedRoute.name}`,
      url: window.location.href,
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    }
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

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* TomTom Daily Quota Exceeded Notification */}
      {planResult.metadata?.tomtomQuotaExceeded && (
        <div className="p-3.5 bg-amber-950/40 border border-amber-500/60 rounded-xl text-amber-200 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <strong className="text-amber-300">TomTom daily free request limit reached:</strong> NaviFlow automatically switched to OSRM fallback routing. Travel times are labeled &quot;No live traffic&quot;.
          </div>
        </div>
      )}

      {/* 1. RECOMMENDED HERO CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 border-2 border-teal-500/50 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Kicker */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              {t.recommendedHeroBadge}
            </span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-xs text-slate-300 font-medium">
              Ranked #1 for {activeStyle} style
            </span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
              {recommendedRoute.trafficSource === 'TomTom' ? 'Live traffic (TomTom)' : 'No live traffic'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <SourceChip
              source={recommendedRoute.energySource}
              label="Fuel"
              fallbackType="Live"
            />
            <SourceChip
              source={recommendedRoute.tollSource}
              label="Toll"
              fallbackType="Estimated"
            />
          </div>
        </div>

        {/* Primary Deterministic Headline */}
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
          {dynamicExplanation.headline}
        </h2>
        <p className="text-sm text-slate-400 mt-1 font-medium">
          {dynamicExplanation.subheadline}
        </p>

        {/* Key Metrics Strip (Tabular Figures) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 pt-4 border-t border-slate-800">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              {t.totalTravelTime}
            </span>
            <div className="text-lg sm:text-xl font-black text-white tabular-nums">
              {Math.floor(recommendedRoute.totalDurationMinutes / 60)}h{' '}
              {recommendedRoute.totalDurationMinutes % 60}m
            </div>
            <span className="text-[11px] text-slate-400">
              ETA: {formatETA(recommendedRoute.totalDurationMinutes)} IST
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
              {t.totalEstimatedCost}
            </span>
            <div className="text-lg sm:text-xl font-black text-white tabular-nums">
              ₹{recommendedRoute.totalCostInr.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-400">
              Energy ₹{recommendedRoute.energyCostInr} + Toll ₹{recommendedRoute.tollCostInr}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              {t.comfortIndex}
            </span>
            <div className="text-lg sm:text-xl font-black text-cyan-400 tabular-nums">
              {Math.round(recommendedRoute.comfortScore * 100)}
              <span className="text-xs text-slate-500 font-normal">/100</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {Math.round(recommendedRoute.expresswayFraction * 100)}% Expressway
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {t.scoreLabel}
            </span>
            <div className="text-lg sm:text-xl font-black text-amber-300 tabular-nums">
              {(recommendedRoute.compositeScore * 100).toFixed(1)}
              <span className="text-xs text-slate-500 font-normal">/100</span>
            </div>
            <span className="text-[11px] text-slate-400">Multi-attribute utility</span>
          </div>
        </div>

        {/* Why Bullets & Trade-off */}
        <div className="space-y-2 text-xs sm:text-sm text-slate-200">
          <div className="font-semibold text-slate-300">Why this route wins:</div>
          <ul className="space-y-1.5 pl-1">
            {dynamicExplanation.whyBullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-start gap-2 text-amber-200/90 bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">What you give up:</strong> {dynamicExplanation.whatYouGiveUp}
            </div>
          </div>
        </div>

        {/* Deterministic Proof Dropdown */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowProof(!showProof)}
            className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-mono cursor-pointer"
          >
            <span>[Deterministic Scoring Proof]</span>
            {showProof ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showProof && (
            <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 space-y-1 animate-in fade-in">
              <p className="text-teal-400">{dynamicExplanation.deterministicProof}</p>
              <p className="text-slate-400 text-[11px]">
                Formula: wT(minT/T) + wC(minC/C) + wM(Comfort) + wS(Stops)
              </p>
              <p className="text-slate-400 text-[11px]">
                Active Weights ({activeStyle}): Time={SCORING_WEIGHTS[activeStyle].time}, Cost={SCORING_WEIGHTS[activeStyle].cost}, Comfort={SCORING_WEIGHTS[activeStyle].comfort}, Stop Quality={SCORING_WEIGHTS[activeStyle].stop}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. ACTIONS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <Bookmark className={`w-3.5 h-3.5 ${savedSuccess ? 'text-teal-400 fill-teal-400' : ''}`} />
            <span>{savedSuccess ? 'Saved to Offline!' : t.saveJourney}</span>
          </button>

          <button
            type="button"
            onClick={handleShareLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{shareSuccess ? 'Link Copied!' : t.shareLink}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.printReport}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenGoogleMaps}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-teal-950/80 hover:border-teal-500 text-teal-300 text-xs font-semibold rounded-lg border border-slate-700 transition-all cursor-pointer ml-auto"
          title="Open coordinate waypoints in Google Maps app"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>{t.openGoogleMaps}</span>
        </button>
      </div>

      {/* 3. SPLIT VIEW: ROUTE CANDIDATE CARDS + INTERACTIVE MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Route Option Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Candidate Highway Corridors ({currentCandidates.length})
          </div>

          {currentCandidates.map((cand) => {
            const isSelected = cand.id === activeRoute.id;
            const isWinner = cand.id === recommendedRoute.id;

            return (
              <div
                key={cand.id}
                onClick={() => setSelectedRouteId(cand.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-teal-400 shadow-lg shadow-teal-950/30 ring-1 ring-teal-400/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Badges */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {isWinner && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-teal-950 border border-teal-500/60 text-teal-300">
                        {t.bestOverall}
                      </span>
                    )}
                    {cand.isFastest && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-sky-950 border border-sky-500/60 text-sky-300">
                        {t.fastest}
                      </span>
                    )}
                    {cand.isCheapest && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300">
                        {t.cheapest}
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-mono font-bold text-teal-400">
                    {(cand.compositeScore * 100).toFixed(1)} pts
                  </div>
                </div>

                <div className="font-bold text-slate-100 text-sm">{cand.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{cand.summary}</div>
                <div className="text-[10px] font-mono text-teal-300 mt-1 flex items-center gap-1.5">
                  <span>{cand.routingProvider === 'TomTom' ? 'TomTom Traffic Routing' : 'OSRM Routing'}</span>
                  <span>·</span>
                  <span>{cand.trafficSource === 'TomTom' ? 'Traffic-aware ETA' : 'No live traffic'}</span>
                </div>

                {/* Core Stats */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Distance</span>
                    <span className="font-semibold text-slate-200 tabular-nums">
                      {cand.distanceKm} km
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total Time</span>
                    <span className="font-semibold text-slate-200 tabular-nums">
                      {Math.floor(cand.totalDurationMinutes / 60)}h{' '}
                      {cand.totalDurationMinutes % 60}m
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total Cost</span>
                    <span className="font-semibold text-slate-200 tabular-nums">
                      ₹{cand.totalCostInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Weighted Sub-score Bars */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Travel Time ({Math.round(cand.timeScore * 100)}%)</span>
                    <span>Cost Economy ({Math.round(cand.costScore * 100)}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-cyan-400"
                      style={{ width: `${cand.timeScore * 50}%` }}
                    />
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${cand.costScore * 50}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Split Interactive Map (7 cols) */}
        <div className="lg:col-span-7 h-[420px] lg:h-[520px]">
          <LeafletMap
            origin={planResult.origin}
            destination={planResult.destination}
            candidates={currentCandidates}
            selectedCandidateId={activeRoute.id}
            onSelectCandidate={(id) => setSelectedRouteId(id)}
            isDashboardMode={isDashboardMode}
          />
        </div>
      </div>

      {/* 4. VERTICAL JOURNEY TIMELINE & STOPS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            {t.timelineTitle} ({activeRoute.name})
          </h3>
          <span className="text-xs text-slate-400">
            {activeRoute.plannedStops.length} Planned Stops · {activeRoute.tollPlazas.length} Tolls
          </span>
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {/* Departure Node */}
          <div className="relative">
            <div className="absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-mono font-bold text-emerald-400">
                0h 00m · DEPARTURE
              </span>
              <span className="text-xs text-slate-400">
                {new Date(planResult.departureTime).toLocaleTimeString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                IST
              </span>
            </div>
            <div className="font-semibold text-slate-100 text-sm mt-0.5">
              {planResult.origin.name}
            </div>
            <div className="text-xs text-slate-400">
              Trip start with {activeVehicle.fuelType === 'EV' ? '80% battery buffer' : 'full tank'}
            </div>
          </div>

          {/* Planned Stops & Toll Plazas */}
          {activeRoute.plannedStops.length === 0 ? (
            <div className="relative">
              <div className="absolute -left-[20px] top-1 w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-900" />
              <div className="text-xs font-semibold text-slate-300">
                Direct Highway Cruise (No refueling stops required)
              </div>
              <p className="text-xs text-slate-400">
                Trip distance ({activeRoute.distanceKm} km) is well within {activeVehicle.name}&apos;s real-world highway range (~{activeVehicle.realWorldRangeKm} km).
              </p>
            </div>
          ) : (
            activeRoute.plannedStops.map((ps, idx) => (
              <div key={idx} className="relative p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="absolute -left-[30px] top-3 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center text-[9px] text-slate-950 font-black">
                  {idx + 1}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                    {ps.type === 'charge' ? <Zap className="w-3.5 h-3.5" /> : <Fuel className="w-3.5 h-3.5" />}
                    {ps.type === 'charge' ? 'FAST CHARGING STOP' : 'REFUEL & STRETCH BREAK'}
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    +{ps.durationMinutes} min stop
                  </span>
                </div>

                <div className="font-semibold text-slate-200 text-sm mt-1">
                  {ps.stop.name}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Location</span>
                    <span className="text-slate-300">~{ps.stop.distanceFromOriginKm} km from start</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Arrival Time</span>
                    <span className="text-slate-300">{ps.arrivalTimeFormatted}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Est. Cost</span>
                    <span className="text-slate-300">₹{ps.costInr}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Amenities</span>
                    <span className="text-slate-300">
                      {ps.stop.hasToilets ? 'Toilets ' : ''}
                      {ps.stop.hasFood ? 'Food ' : ''}
                      {ps.stop.isOpen24x7 ? '24/7' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Toll Plazas summary node */}
          {activeRoute.tollPlazas.length > 0 && (
            <div className="relative p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl">
              <div className="absolute -left-[29px] top-3 w-3.5 h-3.5 rounded-full bg-amber-500" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">
                  FASTag Toll Corridors ({activeRoute.tollPlazas.length} plazas)
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  Total ₹{activeRoute.tollCostInr}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Automated FASTag electronic toll collection. Rates estimated from NHAI tariff matrices.
              </p>
            </div>
          )}

          {/* Destination Node */}
          <div className="relative">
            <div className="absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-slate-900" />
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-mono font-bold text-red-400">
                {Math.floor(activeRoute.totalDurationMinutes / 60)}h{' '}
                {activeRoute.totalDurationMinutes % 60}m · DESTINATION
              </span>
              <span className="text-xs text-slate-400">
                {formatETA(activeRoute.totalDurationMinutes)} IST
              </span>
            </div>
            <div className="font-semibold text-slate-100 text-sm mt-0.5">
              {planResult.destination.name}
            </div>
            <div className="text-xs text-slate-400">
              Arrival with verified safety reserve buffer.
            </div>
          </div>
        </div>
      </div>

      {/* 5. LIVE "WHAT IF?" RE-SCORING ENGINE SWITCHER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-4 h-4 text-teal-400" />
          <h3 className="text-base font-bold text-slate-100">{t.whatIfTitle}</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Switch priority or vehicle live. NaviFlow recalculates all multi-criteria scores instantly without reloading or re-fetching geometries.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Style Switcher */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Change Style:
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              {(['Fast', 'Cheap', 'Comfort'] as JourneyStyle[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setActiveStyle(st)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    activeStyle === st
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Switcher */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Change Powertrain / Model:
            </label>
            <select
              value={activeVehicle.id}
              onChange={(e) => {
                const match = INDIAN_VEHICLE_PRESETS.find((v) => v.id === e.target.value);
                if (match) setActiveVehicle(match);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
            >
              {INDIAN_VEHICLE_PRESETS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.fuelType} · {v.efficiency} {v.fuelType === 'EV' ? 'km/kWh' : 'km/L'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 6. STYLE COMPARISON MATRIX */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-300 mb-2">{t.compareStyles}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-3">Style</th>
                  <th className="py-2 px-3">Top Winner</th>
                  <th className="py-2 px-3 text-right">Time</th>
                  <th className="py-2 px-3 text-right">Cost</th>
                  <th className="py-2 pl-3 text-right">Utility Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {(['Fast', 'Cheap', 'Comfort'] as JourneyStyle[]).map((st) => {
                  const scored = normalizeAndScoreCandidates(planResult.candidates, st);
                  const top = [...scored].sort((a, b) => b.compositeScore - a.compositeScore)[0];
                  return (
                    <tr key={st} className={activeStyle === st ? 'text-teal-300 bg-teal-950/20' : 'text-slate-300'}>
                      <td className="py-2 pr-3 font-bold">{st}</td>
                      <td className="py-2 px-3 truncate max-w-[180px]">{top.name}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {Math.floor(top.totalDurationMinutes / 60)}h {top.totalDurationMinutes % 60}m
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">₹{top.totalCostInr}</td>
                      <td className="py-2 pl-3 text-right tabular-nums font-mono">
                        {(top.compositeScore * 100).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
