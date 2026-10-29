/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Bookmark,
  Settings,
  Download,
  Sun,
  Moon,
  Gauge,
  MoreHorizontal,
  Beaker,
  Database,
  X,
  Plus,
} from 'lucide-react';
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
  onOpenDataSources?: () => void;
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
  onOpenDataSources,
}) => {
  const t = TRANSLATIONS[lang];
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      {/* Optional Dismissible PWA Install Banner (Shown once if installable, not permanent header button) */}
      {showInstallBanner && isInstallable && !isInstalled && (
        <div className="w-full bg-[#0B6B3A] text-white px-4 py-2 text-xs flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            <span>Install NaviFlow for offline highway plans &amp; rapid access</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={install}
              className="px-2.5 py-1 bg-white text-[#0B6B3A] font-bold rounded hover:bg-stone-100 cursor-pointer text-xs"
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => setShowInstallBanner(false)}
              className="p-1 hover:text-stone-200 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Surface Header with subtle highway green hairline accent */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#1B1D1A] border-b border-[#E6E2DC] dark:border-[#2E302B] shadow-xs select-none relative">
        {/* Thin Green Accent Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-[#0B6B3A]" />

        <div className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 h-16">
          {/* Left: Brand Wordmark + Plan & Saved Nav */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className="flex items-center gap-2.5 text-left shrink-0 group focus-visible:ring-2 focus-visible:ring-[#0B6B3A] rounded-lg p-1 cursor-pointer"
              aria-label="NaviFlow Home"
            >
              <div className="w-9 h-9 rounded-lg bg-[#0B6B3A] text-white flex items-center justify-center font-bold shadow-xs">
                <Compass className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-[#1C1B1A] dark:text-[#F5F4F0] leading-none">
                  NaviFlow
                </span>
                <span className="text-xs text-[#5C5A57] dark:text-[#A8A29E] font-medium leading-none mt-1 hidden md:inline">
                  India Road-Trip Decision Engine
                </span>
              </div>
            </button>

            {/* Main Tabs: Plan and Saved */}
            <nav className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('plan')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'plan'
                    ? 'bg-[#FAF8F5] dark:bg-[#121311] text-[#0B6B3A] dark:text-[#22C55E] border border-[#E6E2DC] dark:border-[#2E302B]'
                    : 'text-[#5C5A57] dark:text-[#A8A29E] hover:text-[#1C1B1A] dark:hover:text-white'
                }`}
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span>Plan</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'saved'
                    ? 'bg-[#FAF8F5] dark:bg-[#121311] text-[#0B6B3A] dark:text-[#22C55E] border border-[#E6E2DC] dark:border-[#2E302B]'
                    : 'text-[#5C5A57] dark:text-[#A8A29E] hover:text-[#1C1B1A] dark:hover:text-white'
                }`}
              >
                <Bookmark className="w-4 h-4 shrink-0" />
                <span>Saved</span>
                {savedCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-[#F5A524] text-stone-950 font-bold text-xs rounded-full tabular-nums">
                    {savedCount}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Right: "New plan" primary button + "⋯" Menu */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNewPlan}
              className="min-h-[44px] px-4 py-2 bg-[#0B6B3A] hover:bg-[#08522C] text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New plan</span>
            </button>

            {/* "⋯" Options Menu Button */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`min-h-[44px] min-w-[44px] p-2 rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] text-[#1C1B1A] dark:text-[#F5F4F0] hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-center cursor-pointer ${
                  isMenuOpen ? 'bg-stone-100 dark:bg-stone-800' : 'bg-[#FAF8F5] dark:bg-[#121311]'
                }`}
                title="More settings and options"
                aria-label="More options"
                aria-expanded={isMenuOpen}
              >
                <MoreHorizontal className="w-5 h-5 text-[#5C5A57] dark:text-[#A8A29E]" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl shadow-xl z-50 p-1.5 space-y-1 text-sm animate-in fade-in zoom-in-95">
                  {/* Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full min-h-[40px] px-3 py-2 text-left hover:bg-[#FAF8F5] dark:hover:bg-stone-800 rounded-xl flex items-center gap-2.5 font-medium text-[#1C1B1A] dark:text-[#F5F4F0] cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
                    <span>Settings</span>
                  </button>

                  {/* Dashboard mode */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onToggleDashboardMode();
                    }}
                    className="w-full min-h-[40px] px-3 py-2 text-left hover:bg-[#FAF8F5] dark:hover:bg-stone-800 rounded-xl flex items-center justify-between font-medium text-[#1C1B1A] dark:text-[#F5F4F0] cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Gauge className="w-4 h-4 text-[#F5A524]" />
                      <span>Dashboard mode</span>
                    </div>
                    {isDashboardMode && (
                      <span className="text-xs px-2 py-0.5 bg-[#0B6B3A] text-white font-bold rounded">ON</span>
                    )}
                  </button>

                  {/* Theme Switch */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onToggleTheme();
                    }}
                    className="w-full min-h-[40px] px-3 py-2 text-left hover:bg-[#FAF8F5] dark:hover:bg-stone-800 rounded-xl flex items-center gap-2.5 font-medium text-[#1C1B1A] dark:text-[#F5F4F0] cursor-pointer"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Moon className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                    )}
                    <span>Theme: {theme === 'dark' ? 'Dark' : 'Light'}</span>
                  </button>

                  {/* Install App */}
                  {isInstallable && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (isIOS) setShowIOSInstallGuide(true);
                        else install();
                      }}
                      className="w-full min-h-[40px] px-3 py-2 text-left hover:bg-[#FAF8F5] dark:hover:bg-stone-800 rounded-xl flex items-center gap-2.5 font-medium text-[#1C1B1A] dark:text-[#F5F4F0] cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
                      <span>Install app</span>
                    </button>
                  )}

                  <div className="border-t border-[#E6E2DC] dark:border-[#2E302B] my-1" />

                  {/* For Evaluators */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setActiveTab('evaluator');
                    }}
                    className="w-full min-h-[40px] px-3 py-2 text-left hover:bg-[#FAF8F5] dark:hover:bg-stone-800 rounded-xl flex items-center gap-2.5 font-medium text-[#1C1B1A] dark:text-[#F5F4F0] cursor-pointer"
                  >
                    <Beaker className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
                    <span>For evaluators</span>
                  </button>

                  {/* Data Sources */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (onOpenDataSources) onOpenDataSources();
                    }}
                    className="w-full min-h-[40px] px-3 py-2 text-left hover:bg-[#FAF8F5] dark:hover:bg-stone-800 rounded-xl flex items-center gap-2.5 font-medium text-[#1C1B1A] dark:text-[#F5F4F0] cursor-pointer"
                  >
                    <Database className="w-4 h-4 text-[#5C5A57] dark:text-[#A8A29E]" />
                    <span>Data sources</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* iOS Install Guide Modal */}
      {showIOSInstallGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold">Install on iPhone / iPad</h3>
            <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
              Tap the Safari Share button <span className="font-bold">⎋</span> at the bottom, then scroll down and tap <span className="font-bold">"Add to Home Screen"</span>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSInstallGuide(false)}
              className="w-full min-h-[44px] bg-[#0B6B3A] text-white font-semibold rounded-xl text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
