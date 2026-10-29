/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { Hero } from './components/Hero';
import { PlannerCard } from './components/PlannerCard';
import { ResultsView } from './components/ResultsView';
import { SavedJourneys } from './components/SavedJourneys';
import { TestLab } from './components/TestLab';
import { Methodology } from './components/Methodology';
import { DataSourcesModal } from './components/DataSourcesModal';
import { SettingsModal } from './components/SettingsModal';
import {
  JourneyPlanResult,
  Coordinates,
  JourneyStyle,
  VehiclePreset,
} from './types';
import { Language, TRANSLATIONS } from './utils/i18n';
import { INDIAN_VEHICLE_PRESETS, DEFAULT_VEHICLE } from './engine/vehicles';
import { Compass, RotateCcw, AlertTriangle } from 'lucide-react';

const SAVED_STORAGE_KEY = 'naviflow_saved_journeys_v1';
const LANG_STORAGE_KEY = 'naviflow_pref_lang';
const DASHBOARD_MODE_KEY = 'naviflow_dashboard_mode';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem(LANG_STORAGE_KEY) as Language) || 'en';
  });
  const [isDashboardMode, setIsDashboardMode] = useState<boolean>(() => {
    return localStorage.getItem(DASHBOARD_MODE_KEY) === 'true';
  });

  // Journey calculation state
  const [isPlanning, setIsPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<JourneyPlanResult | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // Saved Journeys list
  const [savedList, setSavedList] = useState<JourneyPlanResult[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Modals
  const [showDataSources, setShowDataSources] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  // Handle plan request
  const handlePlanJourney = async (params: {
    origin: Coordinates;
    destination: Coordinates;
    vehicle: VehiclePreset;
    journeyStyle: JourneyStyle;
    departureTime: string;
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
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const result: JourneyPlanResult = await res.json();
      setPlanResult(result);
      setActiveTab('planner');
    } catch (err: any) {
      console.error('Plan calculation failed:', err);
      setPlanError(err.message || 'Route calculation failed.');
      throw err;
    } finally {
      setIsPlanning(false);
    }
  };

  const handleSaveJourney = (item: JourneyPlanResult) => {
    setSavedList((prev) => [item, ...prev.filter((p) => p.recommendedRouteId !== item.recommendedRouteId)]);
  };

  const handleDeleteJourney = (index: number) => {
    setSavedList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenJourney = (item: JourneyPlanResult) => {
    setPlanResult(item);
    setActiveTab('planner');
  };

  const t = TRANSLATIONS[lang];

  return (
    <div className={`min-h-screen flex flex-col ${isDashboardMode ? 'bg-[#050811] text-white' : 'bg-[#0B101B] text-slate-100'}`}>
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        onOpenDataSources={() => setShowDataSources(true)}
        onOpenSettings={() => setShowSettings(true)}
        savedCount={savedList.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Error notification if global error occurs */}
        {planError && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-500/50 rounded-xl text-xs sm:text-sm text-red-200 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{planError}</span>
            </div>
            <button
              type="button"
              onClick={() => setPlanError(null)}
              className="text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. HOME VIEW */}
        {activeTab === 'home' && (
          <div className="space-y-10">
            <Hero
              onStartPlanning={() => setActiveTab('planner')}
              onOpenDataSources={() => setShowDataSources(true)}
              lang={lang}
            />

            {/* Embedded Fast Planner */}
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-4">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">
                  Interactive Route Planner
                </span>
                <h3 className="text-xl font-bold text-white mt-1">Plan Your Indian Journey</h3>
              </div>
              <PlannerCard
                onPlan={handlePlanJourney}
                isLoading={isPlanning}
                lang={lang}
              />
            </div>
          </div>
        )}

        {/* 2. PLANNER VIEW */}
        {activeTab === 'planner' && (
          <div className="space-y-8">
            {planResult ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPlanResult(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold rounded-lg text-slate-300 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
                      <span>Edit Query / New Plan</span>
                    </button>
                  </div>
                  <div className="text-xs text-slate-400 hidden sm:block">
                    {planResult.origin.name} → {planResult.destination.name}
                  </div>
                </div>

                <ResultsView
                  planResult={planResult}
                  onSaveJourney={handleSaveJourney}
                  lang={lang}
                  isDashboardMode={isDashboardMode}
                />
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-extrabold text-white">Journey Planner</h2>
                  <p className="text-xs text-slate-400">
                    Input your route, powertrain, and priorities to generate a verified, live-data plan.
                  </p>
                </div>
                <PlannerCard
                  onPlan={handlePlanJourney}
                  isLoading={isPlanning}
                  lang={lang}
                />
              </div>
            )}
          </div>
        )}

        {/* 3. SAVED VIEW */}
        {activeTab === 'saved' && (
          <SavedJourneys
            savedList={savedList}
            onOpenJourney={handleOpenJourney}
            onDeleteJourney={handleDeleteJourney}
            onImportJourneys={(list) => setSavedList((prev) => [...list, ...prev])}
            lang={lang}
          />
        )}

        {/* 4. TEST LAB VIEW */}
        {activeTab === 'testlab' && <TestLab lang={lang} />}

        {/* 5. METHODOLOGY VIEW */}
        {activeTab === 'methodology' && <Methodology lang={lang} />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400">
          <span>NaviFlow &copy; {new Date().getFullYear()}</span>
          <span>·</span>
          <span>TomTom &copy; Routing &amp; Maps</span>
          <span>·</span>
          <span>OpenStreetMap &copy; ODbL</span>
          <span>·</span>
          <span>OSRM Fallback</span>
          <span>·</span>
          <span>Overpass API</span>
          <span>·</span>
          <span>Open Charge Map</span>
        </div>
        <p className="max-w-xl mx-auto text-[11px] text-slate-500">
          Built for drivers across India with 100% free open tools. No Google Maps Platform keys or credit card dependencies.
        </p>
      </footer>

      {/* Modals */}
      <DataSourcesModal
        isOpen={showDataSources}
        onClose={() => setShowDataSources(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        lang={lang}
        onSelectLang={(l) => setLang(l)}
        isDashboardMode={isDashboardMode}
        onToggleDashboardMode={(val) => setIsDashboardMode(val)}
      />
    </div>
  );
}
