/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Compass, Bookmark, Settings, Download, Sun, Moon, Gauge } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type NavTab = 'plan' | 'saved' | 'settings';

interface Props {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  lang: Language;
  onOpenSettings: () => void;
  savedCount: number;
  theme: 'auto' | 'light' | 'dark';
  onToggleTheme: () => void;
  isDashboardMode: boolean;
  onToggleDashboardMode: () => void;
  hasActivePlan: boolean;
  onNewPlan: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  lang,
  onOpenSettings,
  savedCount,
  theme,
  onToggleTheme,
  isDashboardMode,
  onToggleDashboardMode,
  hasActivePlan,
  onNewPlan,
}) => {
  const t = TRANSLATIONS[lang];
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#1B365D] border-b border-[#25467A] shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 h-15">
        {/* Brand Wordmark (National Highway Sign Theme) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('plan');
          }}
          className="flex items-center gap-2.5 text-left shrink-0 group focus:outline-none rounded-md cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-400 text-slate-950 flex items-center justify-center font-black shadow-sm group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-white leading-none">
              NaviFlow<span className="text-teal-300 font-bold text-xs ml-1 font-mono">INDIA</span>
            </span>
            <span className="text-[10px] text-teal-200/80 font-medium leading-none mt-0.5 hidden sm:inline">
              Highway Journey Intelligence
            </span>
          </div>
        </button>

        {/* Main Nav ONLY: Plan, Saved, Settings */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* 1. Plan Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'plan'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
                : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Compass className="w-4 h-4 text-teal-300" />
            <span>Plan</span>
          </button>

          {/* 2. Saved Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'saved'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
                : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Bookmark className="w-4 h-4 text-amber-300" />
            <span>Saved</span>
            {savedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-teal-400 text-slate-950 font-bold rounded-full font-mono">
                {savedCount}
              </span>
            )}
          </button>

          {/* 3. Settings Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('settings');
              onOpenSettings();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
                : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-300" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Right Actions: PWA Install + Dashboard Mode Toggle + Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* Dashboard mode toggle for in-car glanceability */}
          <button
            type="button"
            onClick={onToggleDashboardMode}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isDashboardMode
                ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300'
                : 'bg-white/10 text-slate-200 hover:bg-white/15'
            }`}
            title="Toggle high-contrast large font Dashboard Mode for in-car mounting"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Dashboard Mode</span>
          </button>

          {/* Theme Quick Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer"
            title={`Current theme: ${theme}. Tap to toggle.`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-teal-300" /> : <Sun className="w-4 h-4 text-amber-300" />}
          </button>

          {/* In-App PWA Install Button */}
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="px-2.5 py-1.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Install NaviFlow as Progressive Web App"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install PWA</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSInstallGuide(true)}
              className="px-2.5 py-1.5 bg-white/15 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add to Home</span>
            </button>
          )}

          {/* New Plan / Edit Pill (if plan is active) */}
          {hasActivePlan && (
            <button
              type="button"
              onClick={onNewPlan}
              className="px-3 py-1.5 bg-white text-slate-950 font-bold text-xs rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shadow-sm shrink-0"
            >
              New Query
            </button>
          )}
        </div>
      </div>

      {/* iOS Install Guide Dialog */}
      {showIOSInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 text-slate-200">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-teal-400" />
              <span>Install on iPhone / iPad</span>
            </h4>
            <div className="text-xs text-slate-300 space-y-2">
              <p>1. Tap the <strong className="text-white">Share</strong> button in the Safari toolbar (square with upward arrow).</p>
              <p>2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.</p>
              <p>3. Tap <strong className="text-white">Add</strong> in the top right corner.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSInstallGuide(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
