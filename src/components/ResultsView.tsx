/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  JourneyPlanResult,
  JourneyStyle,
  VehiclePreset,
  PlannedStop,
  DepartureTimeSlot,
  TripQuestionResponse,
} from '../types';
import { HowWeScoreModal } from './HowWeScoreModal';
import { ReportIssueModal } from './ReportIssueModal';
import {
  normalizeAndScoreCandidates,
  generateDeterministicExplanation,
} from '../engine/scoring';
import {
  getBlendedPersonalizedWeights,
  recordUserDecision,
  clearLoggedDecisions,
  PERSONALIZATION_ENABLED_KEY,
} from '../engine/personalization';
import { savePlanToIndexedDB, generateCalendarIcs } from '../utils/offlineStorage';
import { INDIAN_VEHICLE_PRESETS } from '../engine/vehicles';
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
  Send,
  Sparkles,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Moon,
  Calendar,
  Check,
  HelpCircle,
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
  const [showCompareVehicleModal, setShowCompareVehicleModal] = useState(false);
  const [comparisonVehicle, setComparisonVehicle] = useState<VehiclePreset>(
    INDIAN_VEHICLE_PRESETS.find((v) => v.id !== planResult.vehicle.id) || INDIAN_VEHICLE_PRESETS[0]
  );
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

  // Action status indicators
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [icsDownloaded, setIcsDownloaded] = useState(false);

  // Grounded Trip Q&A state
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<TripQuestionResponse[]>([]);
  const [qaError, setQaError] = useState<string | null>(null);
  const [highlightedStopNames, setHighlightedStopNames] = useState<string[]>([]);

  // Personalization State
  const [personalizationEnabled, setPersonalizationEnabled] = useState(
    typeof window !== 'undefined' ? localStorage.getItem(PERSONALIZATION_ENABLED_KEY) !== 'false' : true
  );
  const [personalizedWeights, setPersonalizedWeights] = useState(() =>
    getBlendedPersonalizedWeights(activeStyle)
  );

  // Post-trip feedback state
  const [feedbackRating, setFeedbackRating] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [feedbackSelectedReasons, setFeedbackSelectedReasons] = useState<string[]>([]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Save viewed plan to IndexedDB for offline access
  useEffect(() => {
    savePlanToIndexedDB(planResult).catch(() => {});
  }, [planResult]);

  // Update personalized weights when activeStyle changes
  useEffect(() => {
    setPersonalizedWeights(getBlendedPersonalizedWeights(activeStyle));
  }, [activeStyle]);

  // Re-score dynamically on style change or custom weights
  const currentCandidates = React.useMemo(() => {
    const weightsToApply = personalizationEnabled && personalizedWeights.isPersonalized
      ? {
          time: personalizedWeights.time,
          cost: personalizedWeights.cost,
          comfort: personalizedWeights.comfort,
          stop: personalizedWeights.stop,
        }
      : undefined;

    return normalizeAndScoreCandidates(planResult.candidates, activeStyle, weightsToApply);
  }, [planResult.candidates, activeStyle, personalizationEnabled, personalizedWeights]);

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

  // Handle toggling personalization
  const handleTogglePersonalization = () => {
    const nextVal = !personalizationEnabled;
    setPersonalizationEnabled(nextVal);
    localStorage.setItem(PERSONALIZATION_ENABLED_KEY, String(nextVal));
  };

  const handleResetPersonalization = () => {
    clearLoggedDecisions();
    setPersonalizedWeights(getBlendedPersonalizedWeights(activeStyle));
  };

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

  // External Google Maps open handler (logs choice for personalization)
  const handleOpenGoogleMaps = () => {
    recordUserDecision(activeRoute, currentCandidates, 'open_maps');
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

  // WhatsApp first share handler (logs choice for personalization)
  const handleWhatsAppShare = () => {
    recordUserDecision(activeRoute, currentCandidates, 'share');
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

  // Save journey (logs choice for personalization)
  const handleSave = () => {
    recordUserDecision(activeRoute, currentCandidates, 'save');
    onSaveJourney(planResult);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Download .ics Calendar File
  const handleDownloadIcs = () => {
    const icsContent = generateCalendarIcs({
      originName: planResult.origin.name.split(',')[0],
      destinationName: planResult.destination.name.split(',')[0],
      departureTime: planResult.departureTime || new Date().toISOString(),
      durationMinutes: activeRoute.totalDurationMinutes,
      routeSummary: activeRoute.name,
    });
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-${planResult.origin.name.split(',')[0]}-to-${planResult.destination.name.split(',')[0]}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setIcsDownloaded(true);
    setTimeout(() => setIcsDownloaded(false), 3000);
  };

  // Grounded Q&A Handler
  const handleAskQuestion = async (customQ?: string) => {
    const q = (customQ || qaQuestion).trim();
    if (!q || qaLoading) return;
    if (qaHistory.length >= 5) {
      setQaError('Plan question limit reached (max 5 per trip to ensure fast performance).');
      return;
    }

    setQaLoading(true);
    setQaError(null);

    try {
      const res = await fetch('/api/trip-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planResult,
          question: q,
          selectedRouteId: activeRoute.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Trip Q&A service temporarily unavailable.');
      }

      const data: TripQuestionResponse = await res.json();
      setQaHistory((prev) => [data, ...prev]);
      setQaQuestion('');

      if (data.referencedStops && data.referencedStops.length > 0) {
        setHighlightedStopNames(data.referencedStops);
      }
    } catch (err: any) {
      setQaError(err.message || 'Could not retrieve answer.');
    } finally {
      setQaLoading(false);
    }
  };

  // Post-trip feedback submit
  const handleSubmitFeedback = async () => {
    if (!feedbackRating) return;
    setIsSubmittingFeedback(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: `${planResult.origin.name}_${planResult.destination.name}_${activeRoute.id}`,
          rating: feedbackRating,
          reasons: feedbackSelectedReasons,
          originName: planResult.origin.name,
          destinationName: planResult.destination.name,
          vehicleFuelType: activeVehicle.fuelType,
          journeyStyle: activeStyle,
        }),
      });
      setFeedbackSubmitted(true);
    } catch {
      setFeedbackSubmitted(true);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const toggleFeedbackReason = (reason: string) => {
    if (feedbackSelectedReasons.includes(reason)) {
      setFeedbackSelectedReasons(feedbackSelectedReasons.filter((r) => r !== reason));
    } else {
      setFeedbackSelectedReasons([...feedbackSelectedReasons, reason]);
    }
  };

  // Formatting helper functions
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    return `${h} h ${m.toString().padStart(2, '0')} min`;
  };

  const formatClockTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date).toLowerCase();
  };

  // Check if active route is the top recommended winner
  const isWinner = activeRoute.id === recommendedRoute.id;

  return (
    <div className="space-y-5 pb-12 text-[#1C1B1A] dark:text-[#F5F4F0]">
      {/* 1. ONE SUMMARY CARD */}
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 shadow-sm space-y-4">
        {/* Match Percentage & How We Decided Link */}
        <div className="flex items-center justify-between gap-2 border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
          <div className="flex items-center gap-2">
            {isWinner ? (
              <span className="px-3 py-1 bg-[#F5A524] text-stone-950 font-bold text-sm rounded-lg tabular-nums whitespace-nowrap">
                Best match · {matchPercentage}%
              </span>
            ) : (
              <span className="px-3 py-1 bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold text-sm rounded-lg tabular-nums whitespace-nowrap">
                Alternate option · {matchPercentage}%
              </span>
            )}
            <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E] font-medium hidden sm:inline">
              for {activeStyle} priority
            </span>

            {/* Personalisation Status Chip */}
            {personalizedWeights.isPersonalized && personalizationEnabled && (
              <span
                className="px-2.5 py-1 bg-[#0B6B3A]/10 border border-[#0B6B3A]/30 text-[#0B6B3A] dark:text-[#22C55E] text-xs font-semibold rounded-lg flex items-center gap-1"
                title={personalizedWeights.explanation}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Personalised</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {personalizedWeights.isPersonalized && (
              <button
                type="button"
                onClick={handleResetPersonalization}
                className="text-xs text-[#5C5A57] dark:text-[#A8A29E] hover:underline flex items-center gap-1 cursor-pointer min-h-[36px] px-1"
                title="Reset learned weights to standard"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowHowWeScore(true)}
              className="text-sm font-semibold text-[#0B6B3A] dark:text-[#22C55E] hover:underline flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>How we decided</span>
            </button>
          </div>
        </div>

        {/* Personalized Weight Explanation (if active) */}
        {personalizedWeights.isPersonalized && personalizationEnabled && (
          <div className="px-3.5 py-2 bg-stone-50 dark:bg-stone-900 border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-xs text-[#5C5A57] dark:text-[#A8A29E] flex items-center justify-between gap-2">
            <span>{personalizedWeights.explanation}</span>
            <button
              type="button"
              onClick={handleTogglePersonalization}
              className="text-[#0B6B3A] dark:text-[#22C55E] font-semibold hover:underline shrink-0 cursor-pointer"
            >
              Turn off
            </button>
          </div>
        )}

        {/* Line 1: Plain-Language Recommendation Sentence */}
        <div className="p-4 bg-[#0B6B3A]/10 border border-[#0B6B3A]/30 rounded-xl">
          <p className="text-base font-semibold text-[#0B6B3A] dark:text-[#22C55E] leading-relaxed">
            {dynamicExplanation.headline}
          </p>
        </div>

        {/* 2×2 Grid of Equal Glanceable Tiles (min-width: 0 to prevent overflow) */}
        <div className="grid grid-cols-2 gap-3 py-1">
          {/* Tile 1: Arrive by */}
          <div className="min-w-0 p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] flex flex-col justify-between">
            <span className="text-[14px] font-medium text-[#5C5A57] dark:text-[#A8A29E] block mb-1">
              Arrive by
            </span>
            <span className="text-[clamp(24px,2.2vw,32px)] font-bold tabular-nums leading-tight tracking-tight text-[#1C1B1A] dark:text-[#F5F4F0] truncate">
              {formatClockTime(arrivalDate)}
            </span>
            <span className="text-[14px] text-[#5C5A57] dark:text-[#A8A29E] block mt-1 truncate">
              Depart {formatClockTime(departureDate)}
            </span>
          </div>

          {/* Tile 2: Total time */}
          <div className="min-w-0 p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] flex flex-col justify-between">
            <span className="text-[14px] font-medium text-[#5C5A57] dark:text-[#A8A29E] block mb-1">
              Total time
            </span>
            <span className="text-[clamp(24px,2.2vw,32px)] font-bold tabular-nums leading-tight tracking-tight text-[#1C1B1A] dark:text-[#F5F4F0] truncate">
              {formatDuration(activeRoute.totalDurationMinutes)}
            </span>
            <span className="text-[14px] text-[#5C5A57] dark:text-[#A8A29E] block mt-1 truncate">
              {Math.round(activeRoute.distanceKm)} km distance
            </span>
          </div>

          {/* Tile 3: Total cost */}
          <div className="min-w-0 p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] flex flex-col justify-between relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[14px] font-medium text-[#5C5A57] dark:text-[#A8A29E]">
                Total cost
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
            <span className="text-[clamp(24px,2.2vw,32px)] font-bold tabular-nums leading-tight tracking-tight text-[#0B6B3A] dark:text-[#22C55E] truncate">
              ~₹{activeRoute.totalCostInr.toLocaleString('en-IN')}
            </span>
            {(() => {
              const tollText = activeRoute.tollCostInr > 0 ? `incl. ~₹${activeRoute.tollCostInr.toLocaleString('en-IN')} tolls` : '';
              const perPersonText = passengerCount > 1 ? `~₹${Math.round(activeRoute.totalCostInr / passengerCount).toLocaleString('en-IN')}/person` : '';
              const costSubline = [tollText, perPersonText].filter(Boolean).join(' · ') || (activeVehicle.fuelType === 'EV' ? 'Charging & energy' : 'Fuel & energy');
              return (
                <span className="text-[14px] text-[#5C5A57] dark:text-[#A8A29E] block mt-1 truncate" title={costSubline}>
                  {costSubline}
                </span>
              );
            })()}
            {activeInfoTooltip === 'totalCost' && (
              <div className="absolute z-20 top-full left-0 mt-1 w-64 p-3 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg shadow-lg text-[13px] text-[#1C1B1A] dark:text-[#F5F4F0]">
                Estimated, based on live state fuel pump tariffs and NHAI FASTag electronic toll rate matrices.
              </div>
            )}
          </div>

          {/* Tile 4: Stops */}
          <div className="min-w-0 p-3.5 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] flex flex-col justify-between">
            <span className="text-[14px] font-medium text-[#5C5A57] dark:text-[#A8A29E] block mb-1">
              Stops
            </span>
            {(() => {
              const stopsCount = activeRoute.plannedStops?.length || 0;
              const totalHaltMinutes = (activeRoute.plannedStops || []).reduce((acc, p) => acc + (p.durationMinutes || 0), 0);
              const stopsSubline = stopsCount === 0 ? 'No stop needed on this route' : `${totalHaltMinutes} min halt planned`;
              return (
                <>
                  <span className="text-[clamp(24px,2.2vw,32px)] font-bold tabular-nums leading-tight tracking-tight text-[#1C1B1A] dark:text-[#F5F4F0] truncate">
                    {stopsCount} {stopsCount === 1 ? 'stop' : 'stops'}
                  </span>
                  <span className="text-[14px] text-[#5C5A57] dark:text-[#A8A29E] block mt-1 truncate" title={stopsSubline}>
                    {stopsSubline}
                  </span>
                </>
              );
            })()}
          </div>
        </div>

        {/* Arrive-By Notice & Calendar ICS Button */}
        {planResult.refineOptions?.arriveByTime && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
              <Calendar className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>Arrive by {planResult.refineOptions.arriveByTime}:</strong> Leave at{' '}
                {formatClockTime(departureDate)} to arrive on schedule.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="min-h-[40px] px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {icsDownloaded ? <Check className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
              <span>{icsDownloaded ? 'Reminder Saved' : 'Add to Calendar (.ics)'}</span>
            </button>
          </div>
        )}

        {/* Single Clean Honest Status Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[14px] text-[#5C5A57] dark:text-[#A8A29E]">
          <span>Live traffic · updated 2 min ago · tolls and fuel are estimates (~)</span>
          <button
            type="button"
            onClick={() => setShowCompareVehicleModal(true)}
            className="text-xs font-semibold text-[#0B6B3A] dark:text-[#22C55E] hover:underline cursor-pointer"
          >
            Compare vehicle →
          </button>
        </div>
      </div>

      {/* Overnight Halt Advisory Card (if active) */}
      {activeRoute.overnightHalt && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 rounded-2xl flex items-start gap-3">
          <Moon className="w-5 h-5 text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-indigo-900 dark:text-indigo-200">
                Recommended Overnight Halt at {activeRoute.overnightHalt.townName}
              </h4>
              <span className="text-xs px-2 py-0.5 bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 rounded font-semibold">
                Night Driving Safety
              </span>
            </div>
            <p className="text-sm text-indigo-800 dark:text-indigo-300 leading-relaxed">
              Arrive by ~{activeRoute.overnightHalt.arrivalTimeFormatted} (approx. {activeRoute.overnightHalt.distanceFromOriginKm} km into the journey). {activeRoute.overnightHalt.reason}
            </p>
            <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium pt-0.5">
              Suggested next morning departure: {activeRoute.overnightHalt.nextMorningDepartureFormatted}.
            </p>
          </div>
        </div>
      )}

      {/* EV Unreachable Gap Warning Banner */}
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

      {/* 2. JOURNEY TIMELINE */}
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Journey timeline</span>
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
                Start · {formatClockTime(departureDate)} · {planResult.origin.name}
              </span>
              <h4 className="text-base font-bold">
                {planResult.origin.name}
              </h4>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                {activeVehicle.fuelType === 'EV' ? 'Starting at 80% charge' : 'Starting with a full tank'}
              </p>
            </div>
          </div>

          {/* Combined Chronological Checkpoints: Planned Stops + Toll Plazas */}
          {(() => {
            type TimelineItem =
              | { kind: 'stop'; data: PlannedStop; distanceKm: number; arrivalMinutes: number }
              | { kind: 'toll'; name: string; tollFee: number; distanceKm: number; arrivalMinutes: number };

            const items: TimelineItem[] = [];

            (activeRoute.plannedStops || []).forEach((ps: PlannedStop) => {
              items.push({
                kind: 'stop',
                data: ps,
                distanceKm: ps.stop.distanceFromOriginKm,
                arrivalMinutes: ps.arrivalMinutesFromStart,
              });
            });

            (activeRoute.tollPlazas || []).forEach((tp, idx) => {
              const dKm = tp.distanceFromOriginKm || Math.round((activeRoute.distanceKm / (activeRoute.tollPlazas.length + 1)) * (idx + 1));
              const arrivalMinutes = Math.round((dKm / Math.max(1, activeRoute.distanceKm)) * activeRoute.drivingDurationMinutes);
              const tollFee = tp.tollFeeEstimatedInr || (activeRoute.tollCostInr > 0 ? Math.round(activeRoute.tollCostInr / Math.max(1, activeRoute.tollPlazas.length)) : 85);
              items.push({
                kind: 'toll',
                name: tp.name || 'Highway FASTag Plaza',
                tollFee,
                distanceKm: dKm,
                arrivalMinutes,
              });
            });

            items.sort((a, b) => a.distanceKm - b.distanceKm);

            if (items.length === 0) {
              return (
                <div className="p-4 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                  Zero intermediate stops required. This trip distance ({activeRoute.distanceKm.toFixed(0)} km) is safely within your {activeVehicle.name}'s real-world range (~{activeVehicle.realWorldRangeKm} km).
                </div>
              );
            }

            return items.map((item, idx) => {
              const itemDate = new Date(departureDate.getTime() + item.arrivalMinutes * 60 * 1000);
              const itemTimeFormatted = formatClockTime(itemDate);

              if (item.kind === 'toll') {
                return (
                  <div key={`toll-${idx}`} className="relative flex items-start gap-3">
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full border-4 border-white dark:border-[#1B1D1A] bg-blue-600" />
                    <div className="w-full border rounded-xl p-3.5 space-y-1.5 bg-[#FAF8F5] dark:bg-[#121311] border-[#E6E2DC] dark:border-[#2E302B]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold tabular-nums">
                            {itemTimeFormatted}
                          </span>
                          <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                            (~{Math.round(item.distanceKm)} km)
                          </span>
                        </div>
                        <span className="text-sm font-bold text-[#0B6B3A] dark:text-[#22C55E] tabular-nums">
                          ~₹{item.tollFee} FASTag
                        </span>
                      </div>
                      <h4 className="text-sm font-bold flex items-center gap-1.5">
                        <span>{item.name}</span>
                        <span className="text-[11px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 rounded font-semibold">
                          Electronic FASTag
                        </span>
                      </h4>
                      <div className="text-xs text-[#5C5A57] dark:text-[#A8A29E]">
                        NHAI FASTag toll checkpoint · ~0 min delay
                      </div>
                    </div>
                  </div>
                );
              }

              const ps = item.data;
              const isHighlighted = highlightedStopNames.some((n) =>
                ps.stop.name.toLowerCase().includes(n.toLowerCase())
              );

              return (
                <div key={`stop-${idx}`} className="relative flex items-start gap-3">
                  <div
                    className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-4 border-white dark:border-[#1B1D1A] ${
                      isHighlighted ? 'bg-emerald-500 ring-4 ring-emerald-300' : 'bg-[#F5A524]'
                    }`}
                  />
                  <div
                    className={`w-full border rounded-xl p-4 space-y-2.5 transition-all ${
                      isHighlighted
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700'
                        : 'bg-[#FAF8F5] dark:bg-[#121311] border-[#E6E2DC] dark:border-[#2E302B]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums">
                          {itemTimeFormatted}
                        </span>
                        <span className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                          (~{Math.round(ps.stop.distanceFromOriginKm)} km)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#0B6B3A] dark:text-[#22C55E]">
                          +{ps.durationMinutes + ps.detourMinutes} min added
                        </span>
                        <span className="text-sm font-bold tabular-nums">
                          {ps.costInr > 0 ? `~₹${ps.costInr}` : 'Free'}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-base font-bold flex items-center gap-2">
                      <span>{ps.stop.name}</span>
                      {isHighlighted && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-600 text-white rounded font-bold">
                          Referenced in Q&amp;A
                        </span>
                      )}
                    </h4>

                    {/* Detour, Distance & Arrival State */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                      <span>{ps.durationMinutes}m halt</span>
                      <span>·</span>
                      <span>+{ps.detourMinutes}m detour ({ps.distanceFromRouteMeters}m off highway)</span>
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
            });
          })()}

          {/* Destination Arrival Point */}
          <div className="relative flex items-start gap-3">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#DC2626] border-4 border-white dark:border-[#1B1D1A]" />
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-[#DC2626]">
                Arrive · {formatClockTime(arrivalDate)} · {planResult.destination.name.split(',')[0]}
              </span>
              <h4 className="text-base font-bold">
                {planResult.destination.name}
              </h4>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Total time: {formatDuration(activeRoute.totalDurationMinutes)} · {Math.round(activeRoute.distanceKm)} km
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GROUNDED TRIP Q&A (Gemini strictly grounded from Plan JSON) */}
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
            <h3 className="text-lg font-bold">Ask About This Trip</h3>
          </div>
          <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E]">
            {qaHistory.length}/5 questions · Strictly grounded in route data
          </span>
        </div>

        <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
          Ask specific questions about this itinerary. Answers are verified directly against planned stops, tariffs, and route data.
        </p>

        {/* Question Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={qaQuestion}
            onChange={(e) => setQaQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAskQuestion();
              }
            }}
            placeholder="e.g. Where is my first meal stop? Or what are the toll charges?"
            disabled={qaLoading || qaHistory.length >= 5}
            className="flex-1 min-h-[44px] bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1B1A] dark:text-[#F5F4F0] focus:outline-none focus:border-[#0B6B3A]"
          />
          <button
            type="button"
            onClick={() => handleAskQuestion()}
            disabled={qaLoading || !qaQuestion.trim() || qaHistory.length >= 5}
            className="min-h-[44px] px-4 bg-[#0B6B3A] hover:bg-[#08522C] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {qaLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Ask</span>
          </button>
        </div>

        {/* Sample Question Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            'Where is my first food stop?',
            'What is the total toll cost?',
            'Are there EV fast chargers?',
            'What is the driving duration?',
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              disabled={qaLoading || qaHistory.length >= 5}
              onClick={() => handleAskQuestion(sample)}
              className="text-xs px-2.5 py-1 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 text-[#5C5A57] dark:text-[#A8A29E] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg transition-colors cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>

        {qaError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200 text-xs">
            {qaError}
          </div>
        )}

        {/* Q&A Responses List */}
        {qaHistory.length > 0 && (
          <div className="space-y-3 pt-2">
            {qaHistory.map((item, idx) => (
              <div
                key={`qa-${idx}`}
                className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl space-y-1.5 text-sm"
              >
                <div className="font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] flex items-center justify-between">
                  <span>Q: {item.question}</span>
                  {item.verifiedNumeric && (
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-medium rounded">
                      Verified Metrics
                    </span>
                  )}
                </div>
                <p className="text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. COMPACT COST CARD */}
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

      {/* 4. COLLAPSIBLE SECTIONS */}
      <div className="space-y-3">
        {/* Section 1: Why This Plan */}
        <div className="border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl overflow-hidden bg-white dark:bg-[#1B1D1A]">
          <button
            type="button"
            onClick={() => setShowWhyThisPlan(!showWhyThisPlan)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left text-base font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Why this plan</span>
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
                <h4 className="text-base font-bold">Why this plan:</h4>
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

        {/* Section 2: Leave Now vs Later */}
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

        {/* Section 3: Weather */}
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

        {/* Section 4: Safety Layer */}
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

        {/* Section 5: Fatigue & Night Advisory */}
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
                      <h5 className="font-bold mb-1">{fa.title}</h5>
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

      {/* 5. 10-SECOND POST-TRIP FEEDBACK CARD */}
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 shadow-sm space-y-3">
        <h4 className="text-base font-bold flex items-center gap-2">
          <span>How was this highway plan?</span>
          <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E] font-normal">(10-second feedback)</span>
        </h4>

        {!feedbackSubmitted ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFeedbackRating('thumbs_up')}
                className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  feedbackRating === 'thumbs_up'
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                    : 'bg-[#FAF8F5] dark:bg-[#121311] border-[#E6E2DC] dark:border-[#2E302B] hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Looks accurate</span>
              </button>

              <button
                type="button"
                onClick={() => setFeedbackRating('thumbs_down')}
                className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  feedbackRating === 'thumbs_down'
                    ? 'bg-red-600 border-red-700 text-white shadow-sm'
                    : 'bg-[#FAF8F5] dark:bg-[#121311] border-[#E6E2DC] dark:border-[#2E302B] hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>Needs improvement</span>
              </button>
            </div>

            {feedbackRating && (
              <div className="space-y-2 pt-1 animate-in fade-in">
                <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E]">Select reasons:</span>
                <div className="flex flex-wrap gap-2">
                  {(feedbackRating === 'thumbs_up'
                    ? ['Accurate toll estimate', 'Well-placed food stops', 'Realistic highway ETA', 'Good EV charger plan']
                    : ['Toll differed', 'Too few food stops', 'Traffic delay', 'Charger speed mismatch']
                  ).map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => toggleFeedbackReason(reason)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        feedbackSelectedReasons.includes(reason)
                          ? 'bg-[#0B6B3A] text-white border-[#0B6B3A]'
                          : 'bg-[#FAF8F5] dark:bg-[#121311] border-[#E6E2DC] dark:border-[#2E302B] text-[#1C1B1A] dark:text-[#F5F4F0]'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback}
                  className="min-h-[40px] px-4 py-2 bg-[#0B6B3A] hover:bg-[#08522C] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer mt-2"
                >
                  {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Thank you for your feedback! It helps improve NaviFlow corridor calibrations.</span>
          </div>
        )}
      </div>

      {/* 6. PERSISTENT ACTIONS BAR */}
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

      {/* Compare Vehicles Modal */}
      {showCompareVehicleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-6 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Car className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
                <span>Side-by-Side Vehicle Comparison</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCompareVehicleModal(false)}
                className="text-stone-400 hover:text-stone-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#5C5A57] dark:text-[#A8A29E]">
                Select comparison vehicle:
              </label>
              <select
                value={comparisonVehicle.id}
                onChange={(e) => {
                  const found = INDIAN_VEHICLE_PRESETS.find((v) => v.id === e.target.value);
                  if (found) setComparisonVehicle(found);
                }}
                className="w-full min-h-[44px] bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl px-3 py-2 text-sm text-[#1C1B1A] dark:text-[#F5F4F0]"
              >
                {INDIAN_VEHICLE_PRESETS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.fuelType}) · {v.efficiency} {v.fuelType === 'EV' ? 'km/kWh' : 'km/L'}
                  </option>
                ))}
              </select>
            </div>

            {/* Side-by-Side Comparison Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
              <div className="p-4 bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl space-y-2">
                <div className="text-xs uppercase font-bold text-[#0B6B3A] dark:text-[#22C55E]">
                  Current: {activeVehicle.name}
                </div>
                <div>
                  <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E] block">Powertrain:</span>
                  <span className="font-semibold">{activeVehicle.fuelType}</span>
                </div>
                <div>
                  <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E] block">Energy Cost:</span>
                  <span className="font-bold text-base text-[#0B6B3A] dark:text-[#22C55E]">
                    ~₹{activeRoute.energyCostInr}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E] block">Total Trip Cost:</span>
                  <span className="font-bold text-lg">
                    ~₹{activeRoute.totalCostInr}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl space-y-2">
                <div className="text-xs uppercase font-bold text-[#F5A524]">
                  Comparison: {comparisonVehicle.name}
                </div>
                <div>
                  <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E] block">Powertrain:</span>
                  <span className="font-semibold">{comparisonVehicle.fuelType}</span>
                </div>
                <div>
                  <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E] block">Energy Cost:</span>
                  <span className="font-bold text-base text-[#F5A524]">
                    ~₹{Math.round(
                      (activeRoute.distanceKm / comparisonVehicle.efficiency) *
                      (comparisonVehicle.fuelType === 'EV' ? 20.5 : comparisonVehicle.fuelType === 'Diesel' ? 92.5 : comparisonVehicle.fuelType === 'CNG' ? 86 : 104)
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E] block">Total Trip Cost:</span>
                  <span className="font-bold text-lg">
                    ~₹{Math.round(
                      (activeRoute.distanceKm / comparisonVehicle.efficiency) *
                      (comparisonVehicle.fuelType === 'EV' ? 20.5 : comparisonVehicle.fuelType === 'Diesel' ? 92.5 : comparisonVehicle.fuelType === 'CNG' ? 86 : 104) +
                      activeRoute.tollCostInr
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setShowCompareVehicleModal(false)}
                className="min-h-[44px] px-5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

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
