/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Compass, Bookmark, Settings, Download, Sun, Moon, Gauge } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type NavTab = 'plan' | 'saved' | 'settings' | 'evaluator' | 'about' | 'datasources';

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
    <header className="sticky top-0 z-40 w-full bg-[#0B6B3A] border-b border-[#08522C] shadow-sm select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 h-16">
        {/* Brand Wordmark (Indian National Highway Signage Green) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('plan');
          }}
          className="flex items-center gap-2.5 text-left shrink-0 group focus-visible:ring-2 focus-visible:ring-white rounded-lg p-1 cursor-pointer"
          aria-label="NaviFlow Home"
        >
          <div className="w-10 h-10 rounded-lg bg-white text-[#0B6B3A] flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
            <Compass className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white leading-none">
              NaviFlow
            </span>
            <span className="text-sm text-emerald-100 font-medium leading-none mt-1 hidden sm:inline">
              India Highway Decision Layer
            </span>
          </div>
        </button>

        {/* Main Nav: Plan, Saved, and Gear for Settings */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. Plan Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'plan'
                ? 'bg-white text-[#0B6B3A] shadow-sm'
                : 'text-white hover:bg-white/15'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>Plan</span>
          </button>

          {/* 2. Saved Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'saved'
                ? 'bg-white text-[#0B6B3A] shadow-sm'
                : 'text-white hover:bg-white/15'
            }`}
          >
            <Bookmark className="w-4 h-4 shrink-0" />
            <span>Saved</span>
            {savedCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-sm bg-[#F5A524] text-stone-900 font-bold rounded-full tabular-nums">
                {savedCount}
              </span>
            )}
          </button>

          {/* 3. Gear for Settings */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('settings');
              onOpenSettings();
            }}
            className={`min-h-[44px] min-w-[44px] p-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center ${
              activeTab === 'settings'
                ? 'bg-white text-[#0B6B3A] shadow-sm'
                : 'text-white hover:bg-white/15'
            }`}
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </nav>

        {/* Right Actions: Dashboard Mode, Theme, In-App PWA Install */}
        <div className="flex items-center gap-2">
          {/* Dashboard Mode (in-car driving view) */}
          <button
            type="button"
            onClick={onToggleDashboardMode}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              isDashboardMode
                ? 'bg-[#F5A524] text-stone-950 shadow-md ring-2 ring-[#F5A524]/50'
                : 'bg-white/15 text-white hover:bg-white/20'
            }`}
            title="Toggle high-contrast Dashboard Mode for in-car glanceability"
          >
            <Gauge className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">Dashboard</span>
          </button>

          {/* Theme Quick Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[44px] min-w-[44px] p-2 rounded-lg bg-white/15 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center justify-center"
            title={`Theme: ${theme}. Click to switch.`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Moon className="w-5 h-5 text-emerald-200" /> : <Sun className="w-5 h-5 text-amber-200" />}
          </button>

          {/* In-App PWA Install */}
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="min-h-[44px] px-3.5 py-2 bg-white hover:bg-stone-100 text-[#0B6B3A] font-bold text-sm rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              title="Install NaviFlow as Progressive Web App"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSInstallGuide(true)}
              className="min-h-[44px] px-3.5 py-2 bg-white/15 text-white font-semibold text-sm rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Add to Home</span>
            </button>
          )}

          {/* New Plan Quick Button */}
          {hasActivePlan && (
            <button
              type="button"
              onClick={onNewPlan}
              className="min-h-[44px] px-3.5 py-2 bg-white text-[#0B6B3A] font-bold text-sm rounded-lg hover:bg-stone-100 transition-colors cursor-pointer shadow-sm shrink-0"
            >
              New Plan
            </button>
          )}
        </div>
      </div>

      {/* iOS Install Guide Dialog */}
      {showIOSInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl w-full max-w-sm p-6 space-y-4 text-[#1C1B1A] dark:text-[#F5F4F0]">
            <h4 className="text-lg font-bold flex items-center gap-2 text-[#0B6B3A] dark:text-[#22C55E]">
              <Download className="w-5 h-5" />
              <span>Install on iPhone / iPad</span>
            </h4>
            <div className="text-sm text-[#5C5A57] dark:text-[#A8A29E] space-y-2">
              <p>1. Tap the <strong className="text-[#1C1B1A] dark:text-[#F5F4F0]">Share</strong> button in Safari toolbar.</p>
              <p>2. Scroll down and tap <strong className="text-[#1C1B1A] dark:text-[#F5F4F0]">Add to Home Screen</strong>.</p>
              <p>3. Tap <strong className="text-[#1C1B1A] dark:text-[#F5F4F0]">Add</strong> in the top right corner.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSInstallGuide(false)}
              className="min-h-[44px] w-full py-2.5 bg-[#0B6B3A] hover:bg-[#08522C] text-white rounded-xl text-base font-semibold transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
