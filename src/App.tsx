/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { PlannerCard } from './components/PlannerCard';
import { ResultsView } from './components/ResultsView';
import { SavedJourneys } from './components/SavedJourneys';
import { LeafletMap } from './components/LeafletMap';
import { DataSourcesModal } from './components/DataSourcesModal';
import { SettingsModal } from './components/SettingsModal';
import { AboutModal } from './components/AboutModal';
import { EvaluatorModal } from './components/EvaluatorModal';
import {
  JourneyPlanResult,
  Coordinates,
  JourneyStyle,
  VehiclePreset,
  RefineOptions,
} from './types';
import { Language, TRANSLATIONS } from './utils/i18n';
import { INDIAN_VEHICLE_PRESETS, DEFAULT_VEHICLE } from './engine/vehicles';
import {
  Compass,
  RotateCcw,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Layers,
  ArrowRight,
  Database,
  Beaker,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';

const SAVED_STORAGE_KEY = 'naviflow_saved_journeys_v2';
const LANG_STORAGE_KEY = 'naviflow_pref_lang';
const DASHBOARD_MODE_KEY = 'naviflow_dashboard_mode';
const THEME_STORAGE_KEY = 'naviflow_pref_theme';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('plan');
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem(LANG_STORAGE_KEY) as Language) || 'en';
  });
  const [isDashboardMode, setIsDashboardMode] = useState<boolean>(() => {
    return localStorage.getItem(DASHBOARD_MODE_KEY) === 'true';
  });
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>(() => {
    return (localStorage.getItem(THEME_STORAGE_KEY) as any) || 'auto';
  });

  // Journey calculation state
  const [isPlanning, setIsPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<JourneyPlanResult | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isEditingQuery, setIsEditingQuery] = useState(false);

  // Mobile Bottom Sheet state ('peek' | 'half' | 'full')
  const [mobileSheetSnap, setMobileSheetSnap] = useState<'peek' | 'half' | 'full'>('full');

  // Saved Journeys list
  const [savedList, setSavedList] = useState<JourneyPlanResult[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Modals state
  const [showDataSources, setShowDataSources] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showEvaluators, setShowEvaluators] = useState(false);

  // Selected candidate route on map
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedList));
  }, [savedList]);

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_MODE_KEY, String(isDashboardMode));
  }, [isDashboardMode]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Compute effective theme (light by day, dark at night)
  const isNightTime = () => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  };

  const effectiveTheme =
    theme === 'auto' ? (isNightTime() ? 'dark' : 'light') : theme;

  useEffect(() => {
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [effectiveTheme]);

  // Check URL query parameters on initial mount for share link loading
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const origParam = searchParams.get('orig');
    const destParam = searchParams.get('dest');
    const vehParam = searchParams.get('veh');
    const styleParam = searchParams.get('style') as JourneyStyle;

    if (origParam && destParam) {
      const veh =
        INDIAN_VEHICLE_PRESETS.find((v) => v.id === vehParam) || DEFAULT_VEHICLE;
      const st =
        styleParam === 'Fast' || styleParam === 'Cheap' || styleParam === 'Comfort'
          ? styleParam
          : 'Fast';

      // Resolve coordinates and plan
      Promise.all([
        fetch(`/api/autocomplete?q=${encodeURIComponent(origParam)}`).then((r) => r.json()),
        fetch(`/api/autocomplete?q=${encodeURIComponent(destParam)}`).then((r) => r.json()),
      ])
        .then(([origList, destList]) => {
          if (origList && origList[0] && destList && destList[0]) {
            handlePlanJourney({
              origin: origList[0],
              destination: destList[0],
              vehicle: veh,
              journeyStyle: st,
              departureTime: new Date().toISOString(),
              refineOptions: {
                passengers: 1,
                avoidTolls: false,
                vegFood: false,
                cleanWashrooms: true,
                familyFriendly: false,
                petFriendly: false,
              },
            });
          }
        })
        .catch((err) => {
          console.warn('Failed to parse share parameters:', err);
        });
    }
  }, []);

  // Update selected route id when new plan arrives
  useEffect(() => {
    if (planResult && planResult.recommendedRouteId) {
      setSelectedRouteId(planResult.recommendedRouteId);
    }
  }, [planResult]);

  // Handle plan request
  const handlePlanJourney = async (params: {
    origin: Coordinates;
    destination: Coordinates;
    vehicle: VehiclePreset;
    journeyStyle: JourneyStyle;
    departureTime: string;
    refineOptions?: RefineOptions;
  }) => {
    setIsPlanning(true);
    setPlanError(null);

    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error (Status ${res.status})`);
      }

      const result: JourneyPlanResult = await res.json();
      setPlanResult(result);
      setSelectedRouteId(result.recommendedRouteId);
      setIsEditingQuery(false);
      setActiveTab('plan');
      setMobileSheetSnap('half');
    } catch (err: any) {
      console.error('Plan calculation failed:', err);
      setPlanError(err.message || 'Route calculation failed. Please retry.');
      throw err;
    } finally {
      setIsPlanning(false);
    }
  };

  const handleSaveJourney = (item: JourneyPlanResult) => {
    setSavedList((prev) => [
      item,
      ...prev.filter((p) => p.recommendedRouteId !== item.recommendedRouteId),
    ]);
  };

  const handleDeleteJourney = (index: number) => {
    setSavedList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenJourney = (item: JourneyPlanResult) => {
    setPlanResult(item);
    setSelectedRouteId(item.recommendedRouteId);
    setActiveTab('plan');
    setIsEditingQuery(false);
    setMobileSheetSnap('half');
  };

  // Toggle theme between Auto -> Light -> Dark
  const handleToggleTheme = () => {
    if (theme === 'auto') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('auto');
  };

  const activeCandidate =
    planResult?.candidates.find((c) => c.id === selectedRouteId) ||
    planResult?.candidates[0];

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden select-none ${
        isDashboardMode
          ? 'bg-[#050811] text-white font-sans'
          : effectiveTheme === 'light'
          ? 'bg-slate-100 text-slate-900 font-sans'
          : 'bg-[#0B101B] text-slate-100 font-sans'
      }`}
    >
      {/* 1. TOP NAVBAR (Main nav: Plan, Saved, Settings) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'plan') {
            setMobileSheetSnap('half');
          }
        }}
        lang={lang}
        onOpenSettings={() => setShowSettings(true)}
        savedCount={savedList.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isDashboardMode={isDashboardMode}
        onToggleDashboardMode={() => setIsDashboardMode(!isDashboardMode)}
        hasActivePlan={!!planResult && !isEditingQuery}
        onNewPlan={() => {
          setIsEditingQuery(true);
          setActiveTab('plan');
          setMobileSheetSnap('full');
        }}
      />

      {/* 2. ONE-SCREEN BODY (Full-bleed Map + Floating Overlay / Draggable Bottom Sheet) */}
      <div className="relative flex-1 w-full h-[calc(100vh-60px)] overflow-hidden">
        {/* Full Bleed Map Layer in background */}
        <div className="absolute inset-0 z-0">
          <LeafletMap
            origin={
              planResult?.origin || {
                lat: 19.076,
                lon: 72.8777,
                name: 'Mumbai, Maharashtra',
              }
            }
            destination={
              planResult?.destination || {
                lat: 18.5204,
                lon: 73.8567,
                name: 'Pune, Maharashtra',
              }
            }
            candidates={planResult?.candidates || []}
            selectedCandidateId={selectedRouteId}
            onSelectCandidate={(id) => setSelectedRouteId(id)}
            isDashboardMode={isDashboardMode}
          />
        </div>

        {/* Global Error Banner */}
        {planError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] max-w-lg w-[90%] p-3.5 bg-red-950/95 border border-red-500 rounded-xl text-xs sm:text-sm text-red-200 flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{planError}</span>
            </div>
            <button
              type="button"
              onClick={() => setPlanError(null)}
              className="text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* DESKTOP FLOATING LEFT PANEL (≥ 1024px) */}
        <div className="hidden lg:flex flex-col absolute top-4 left-4 bottom-4 z-[450] w-[480px] max-w-[calc(100vw-32px)] bg-[#111827]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
          {/* Top Panel Title & Context Pill */}
          <div className="px-4 py-3 bg-[#1B365D] border-b border-[#25467A] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-white">
              <Compass className="w-4 h-4 text-teal-400" />
              <span className="font-bold text-xs uppercase tracking-wider">
                {activeTab === 'saved'
                  ? 'Saved Library'
                  : planResult && !isEditingQuery
                  ? 'Trip Decision Plan'
                  : 'Trip Planner'}
              </span>
            </div>

            {planResult && activeTab === 'plan' && (
              <button
                type="button"
                onClick={() => setIsEditingQuery(!isEditingQuery)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-teal-300" />
                <span>{isEditingQuery ? 'View Plan' : 'Edit Query'}</span>
              </button>
            )}
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'saved' ? (
              <SavedJourneys
                savedList={savedList}
                onOpenJourney={handleOpenJourney}
                onDeleteJourney={handleDeleteJourney}
                onImportJourneys={(list) => setSavedList(list)}
                lang={lang}
              />
            ) : planResult && !isEditingQuery ? (
              <ResultsView
                planResult={planResult}
                onSaveJourney={handleSaveJourney}
                lang={lang}
                isDashboardMode={isDashboardMode}
                onRePlan={handlePlanJourney}
              />
            ) : (
              <PlannerCard
                onPlan={handlePlanJourney}
                isLoading={isPlanning}
                initialOrigin={planResult?.origin}
                initialDestination={planResult?.destination}
                lang={lang}
              />
            )}
          </div>

          {/* Footer Links (About, Data Sources, For Evaluators) */}
          <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAbout(true)}
                className="hover:text-teal-400 transition-colors cursor-pointer"
              >
                About
              </button>
              <span>&middot;</span>
              <button
                type="button"
                onClick={() => setShowDataSources(true)}
                className="hover:text-teal-400 transition-colors cursor-pointer"
              >
                Data Sources
              </button>
            </div>

            {/* "For evaluators" link */}
            <button
              type="button"
              onClick={() => setShowEvaluators(true)}
              className="text-amber-400/90 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Beaker className="w-3 h-3" />
              <span>For Evaluators</span>
            </button>
          </div>
        </div>

        {/* MOBILE DRAGGABLE BOTTOM SHEET (< 1024px) */}
        <div
          className={`lg:hidden absolute left-0 right-0 bottom-0 z-[450] bg-[#111827] border-t border-slate-700 rounded-t-3xl shadow-2xl flex flex-col transition-all duration-300 ease-out ${
            mobileSheetSnap === 'peek'
              ? 'h-[105px]'
              : mobileSheetSnap === 'half'
              ? 'h-[52vh]'
              : 'h-[90vh]'
          }`}
        >
          {/* Draggable Handle & Snap Indicators */}
          <div
            className="w-full pt-2 pb-2 px-4 flex flex-col items-center shrink-0 cursor-grab active:cursor-grabbing bg-slate-900 rounded-t-3xl border-b border-slate-800"
            onClick={() => {
              if (mobileSheetSnap === 'peek') setMobileSheetSnap('half');
              else if (mobileSheetSnap === 'half') setMobileSheetSnap('full');
              else setMobileSheetSnap('peek');
            }}
          >
            {/* Grab bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-600 mb-2" />

            {/* Header pill */}
            <div className="w-full flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-teal-400" />
                  {activeTab === 'saved'
                    ? 'Saved Journeys'
                    : planResult && !isEditingQuery
                    ? `${planResult.origin.name.split(',')[0]} → ${planResult.destination.name.split(',')[0]}`
                    : 'Plan Highway Trip'}
                </span>
                {planResult && !isEditingQuery && activeCandidate && (
                  <span className="text-teal-400 font-mono font-bold">
                    ₹{activeCandidate.totalCostInr} · {Math.floor(activeCandidate.totalDurationMinutes / 60)}h {activeCandidate.totalDurationMinutes % 60}m
                  </span>
                )}
              </div>

              {/* Snap Cycle Toggle Button */}
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="capitalize">{mobileSheetSnap}</span>
                {mobileSheetSnap === 'full' ? (
                  <ChevronDown className="w-4 h-4 text-teal-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-teal-400" />
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'saved' ? (
              <SavedJourneys
                savedList={savedList}
                onOpenJourney={handleOpenJourney}
                onDeleteJourney={handleDeleteJourney}
                onImportJourneys={(list) => setSavedList(list)}
                lang={lang}
              />
            ) : planResult && !isEditingQuery ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingQuery(true);
                      setMobileSheetSnap('full');
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-teal-400" />
                    <span>Change Query</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {planResult.metadata?.routingProvider} Engine
                  </span>
                </div>

                <ResultsView
                  planResult={planResult}
                  onSaveJourney={handleSaveJourney}
                  lang={lang}
                  isDashboardMode={isDashboardMode}
                  onRePlan={handlePlanJourney}
                />
              </div>
            ) : (
              <PlannerCard
                onPlan={handlePlanJourney}
                isLoading={isPlanning}
                initialOrigin={planResult?.origin}
                initialDestination={planResult?.destination}
                lang={lang}
              />
            )}

            {/* Mobile Footer Links */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAbout(true)}
                  className="hover:text-teal-400 cursor-pointer"
                >
                  About
                </button>
                <span>&middot;</span>
                <button
                  type="button"
                  onClick={() => setShowDataSources(true)}
                  className="hover:text-teal-400 cursor-pointer"
                >
                  Data Sources
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowEvaluators(true)}
                className="text-amber-400 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Beaker className="w-3 h-3" />
                <span>For Evaluators</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <DataSourcesModal isOpen={showDataSources} onClose={() => setShowDataSources(false)} />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        lang={lang}
        onSelectLang={(l) => setLang(l)}
        isDashboardMode={isDashboardMode}
        onToggleDashboardMode={(v) => setIsDashboardMode(v)}
        theme={theme}
        onSelectTheme={(th) => setTheme(th)}
      />

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <EvaluatorModal isOpen={showEvaluators} onClose={() => setShowEvaluators(false)} lang={lang} />
    </div>
  );
}
