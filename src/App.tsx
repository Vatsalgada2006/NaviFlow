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
import { AboutModal } from './components/AboutModal';
import { SettingsPage } from './components/SettingsPage';
import { EvaluatorPage } from './components/EvaluatorPage';
import { PlanningSkeleton } from './components/PlanningSkeleton';
import {
  JourneyPlanResult,
  JourneyStyle,
  VehiclePreset,
  RefineOptions,
} from './types';
import { Language } from './utils/i18n';
import { INDIAN_VEHICLE_PRESETS, DEFAULT_VEHICLE } from './engine/vehicles';
import {
  Compass,
  RotateCcw,
  AlertTriangle,
  Beaker,
  Database,
  Info,
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

  // Fullscreen map modal for mobile
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);

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
  const [showAbout, setShowAbout] = useState(false);

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

      Promise.all([
        fetch(`/api/autocomplete?q=${encodeURIComponent(origParam)}`).then((r) => r.json()),
        fetch(`/api/autocomplete?q=${encodeURIComponent(destParam)}`).then((r) => r.json()),
      ])
        .then(([origList, destList]) => {
          if (origList && origList.length > 0 && destList && destList.length > 0) {
            handlePlanJourney({
              origin: origList[0],
              destination: destList[0],
              vehicle: veh,
              journeyStyle: st,
              departureTime: new Date().toISOString(),
            });
          }
        })
        .catch((e) => console.warn('URL plan error:', e));
    }
  }, []);

  // AbortController ref to cancel stale requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelPlan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPlanning(false);
  };

  // Main plan calculation handler
  const handlePlanJourney = async (params: {
    origin: any;
    destination: any;
    vehicle: VehiclePreset;
    journeyStyle: JourneyStyle;
    departureTime: string;
    refineOptions?: RefineOptions;
  }) => {
    // Cancel any stale in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsPlanning(true);
    setPlanError(null);

    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error ${res.status}`);
      }

      const data: JourneyPlanResult = await res.json();
      setPlanResult(data);
      setSelectedRouteId(data.recommendedRouteId);
      setIsEditingQuery(false);
      setActiveTab('plan');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was cancelled intentionally
        return;
      }
      console.error('Plan calculation failed:', err);
      setPlanError(err.message || 'Route calculation failed. Please retry.');
      throw err;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsPlanning(false);
      }
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
  };

  // Toggle theme between Auto -> Light -> Dark
  const handleToggleTheme = () => {
    if (theme === 'auto') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('auto');
  };

  // Dedicated full pages for Settings and Evaluator
  if (activeTab === 'settings') {
    return (
      <SettingsPage
        onBack={() => setActiveTab('plan')}
        lang={lang}
        onSelectLang={(l) => setLang(l)}
        isDashboardMode={isDashboardMode}
        onToggleDashboardMode={(v) => setIsDashboardMode(v)}
        theme={theme}
        onSelectTheme={(th) => setTheme(th)}
      />
    );
  }

  if (activeTab === 'evaluator') {
    return <EvaluatorPage onBack={() => setActiveTab('plan')} lang={lang} />;
  }

  return (
    <div className="min-h-screen w-screen flex flex-col bg-[#FAF8F5] dark:bg-[#121311] text-[#1C1B1A] dark:text-[#F5F4F0] antialiased">
      {/* 1. TOP NAVBAR (Main nav: Plan, Saved, Gear for Settings) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
        }}
        lang={lang}
        onOpenSettings={() => setActiveTab('settings')}
        savedCount={savedList.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isDashboardMode={isDashboardMode}
        onToggleDashboardMode={() => setIsDashboardMode(!isDashboardMode)}
        hasActivePlan={!!planResult && !isEditingQuery}
        onNewPlan={() => {
          setIsEditingQuery(true);
          setActiveTab('plan');
        }}
      />

      {/* Global Error Banner */}
      {planError && (
        <div className="mx-4 sm:mx-6 mt-3 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl text-sm text-red-800 dark:text-red-200 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>{planError}</span>
          </div>
          <button
            type="button"
            onClick={() => setPlanError(null)}
            className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. ONE-SCREEN BODY: Mobile Vertical Scroll / Desktop Fixed ~420px Left Panel */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* MOBILE VIEW (< 1024px): Map of fixed height (~35vh) at top, then scrollable plan below */}
        <div className="flex lg:hidden flex-col flex-1 overflow-y-auto">
          {/* Top Map: ~35vh fixed height with "Full map" button */}
          <div className="h-[35vh] w-full shrink-0 relative border-b border-[#E6E2DC] dark:border-[#2E302B]">
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
              onOpenFullMap={() => setIsFullMapOpen(true)}
            />
          </div>

          {/* Vertical scrollable content below map on mobile */}
          <div className="p-4 space-y-4 flex-1">
            {activeTab === 'saved' ? (
              <SavedJourneys
                savedList={savedList}
                onOpenJourney={handleOpenJourney}
                onDeleteJourney={handleDeleteJourney}
                onImportJourneys={(list) => setSavedList(list)}
                lang={lang}
              />
            ) : isPlanning ? (
              <PlanningSkeleton onCancel={handleCancelPlan} />
            ) : planResult && !isEditingQuery ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsEditingQuery(true)}
                    className="min-h-[44px] px-3.5 py-2 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
                    <span>Change Query</span>
                  </button>
                  <span className="text-sm font-medium text-[#5C5A57] dark:text-[#A8A29E]">
                    National Highway Corridor
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
            <footer className="pt-6 pb-6 border-t border-[#E6E2DC] dark:border-[#2E302B] flex flex-wrap items-center justify-between gap-3 text-sm text-[#5C5A57] dark:text-[#A8A29E]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAbout(true)}
                  className="hover:text-[#0B6B3A] dark:hover:text-[#22C55E] cursor-pointer min-h-[44px] flex items-center"
                >
                  About
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setShowDataSources(true)}
                  className="hover:text-[#0B6B3A] dark:hover:text-[#22C55E] cursor-pointer min-h-[44px] flex items-center"
                >
                  Data Sources
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('evaluator')}
                className="text-[#0B6B3A] dark:text-[#22C55E] font-bold flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <Beaker className="w-4 h-4" />
                <span>For Evaluators</span>
              </button>
            </footer>
          </div>
        </div>

        {/* DESKTOP VIEW (≥ 1024px): Fixed-width ~420px left panel that scrolls and never collapses, map fills rest */}
        <div className="hidden lg:flex w-[420px] shrink-0 border-r border-[#E6E2DC] dark:border-[#2E302B] bg-[#FAF8F5] dark:bg-[#121311] flex-col justify-between overflow-y-auto">
          {/* Left panel header & content */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
                <span className="font-bold text-base">
                  {activeTab === 'saved'
                    ? 'Saved Journeys'
                    : planResult && !isEditingQuery
                    ? 'Explained Route Plan'
                    : 'Highway Journey Planner'}
                </span>
              </div>

              {planResult && activeTab === 'plan' && (
                <button
                  type="button"
                  onClick={() => setIsEditingQuery(!isEditingQuery)}
                  className="min-h-[38px] px-3 py-1.5 bg-white dark:bg-[#1B1D1A] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
                  <span>{isEditingQuery ? 'View Plan' : 'Edit Query'}</span>
                </button>
              )}
            </div>

            {activeTab === 'saved' ? (
              <SavedJourneys
                savedList={savedList}
                onOpenJourney={handleOpenJourney}
                onDeleteJourney={handleDeleteJourney}
                onImportJourneys={(list) => setSavedList(list)}
                lang={lang}
              />
            ) : isPlanning ? (
              <PlanningSkeleton onCancel={handleCancelPlan} />
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

          {/* Desktop Left Panel Footer Links */}
          <footer className="p-4 border-t border-[#E6E2DC] dark:border-[#2E302B] bg-white dark:bg-[#1B1D1A] flex items-center justify-between text-sm text-[#5C5A57] dark:text-[#A8A29E] shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAbout(true)}
                className="hover:text-[#0B6B3A] dark:hover:text-[#22C55E] cursor-pointer min-h-[44px] flex items-center"
              >
                About
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setShowDataSources(true)}
                className="hover:text-[#0B6B3A] dark:hover:text-[#22C55E] cursor-pointer min-h-[44px] flex items-center"
              >
                Data Sources
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('evaluator')}
              className="text-[#0B6B3A] dark:text-[#22C55E] font-bold flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <Beaker className="w-4 h-4" />
              <span>For Evaluators</span>
            </button>
          </footer>
        </div>

        {/* Desktop Map (Fills the entire rest of the screen) */}
        <div className="hidden lg:block flex-1 h-full relative">
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
      </div>

      {/* MOBILE FULL-SCREEN MAP MODAL */}
      {isFullMapOpen && (
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
          isFullScreen={true}
          onCloseFullScreen={() => setIsFullMapOpen(false)}
        />
      )}

      {/* MODALS */}
      <DataSourcesModal isOpen={showDataSources} onClose={() => setShowDataSources(false)} />
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}
