/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Compass, Database, Settings } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';

export type NavTab = 'home' | 'planner' | 'saved' | 'testlab' | 'methodology';

interface Props {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  lang: Language;
  onOpenDataSources: () => void;
  onOpenSettings: () => void;
  savedCount: number;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  lang,
  onOpenDataSources,
  onOpenSettings,
  savedCount,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B101B]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 h-16">
        {/* Zone 1: Brand Wordmark (Single text element in display style) */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 text-left whitespace-nowrap shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-md"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-sm group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">
            NaviFlow<span className="text-teal-400 font-semibold text-sm ml-1 font-mono">IN</span>
          </span>
        </button>

        {/* Zone 2: 4-5 Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
              activeTab === 'home'
                ? 'text-teal-400 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t.navHome}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
              activeTab === 'planner'
                ? 'text-teal-400 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t.navPlanner}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
              activeTab === 'saved'
                ? 'text-teal-400 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>{t.navSaved}</span>
            {savedCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 text-[10px] bg-slate-800 text-teal-300 rounded font-mono">
                {savedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('testlab')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
              activeTab === 'testlab'
                ? 'text-teal-400 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t.navTestLab}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('methodology')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
              activeTab === 'methodology'
                ? 'text-teal-400 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t.navMethodology}
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action Group (Data sources status + Settings) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenDataSources}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Inspect free live data providers status"
          >
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Data Sources</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Preferences & Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            {activeTab === 'planner' ? 'New Plan' : 'Plan Trip'}
          </button>
        </div>
      </div>

      {/* Mobile Secondary Tab Strip */}
      <div className="md:hidden flex items-center justify-around px-2 py-2 border-t border-slate-800/80 bg-slate-950 text-xs font-medium overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`px-3 py-1 rounded ${activeTab === 'home' ? 'text-teal-400 bg-slate-800' : 'text-slate-400'}`}
        >
          {t.navHome}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('planner')}
          className={`px-3 py-1 rounded ${activeTab === 'planner' ? 'text-teal-400 bg-slate-800' : 'text-slate-400'}`}
        >
          {t.navPlanner}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`px-3 py-1 rounded ${activeTab === 'saved' ? 'text-teal-400 bg-slate-800' : 'text-slate-400'}`}
        >
          {t.navSaved}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('testlab')}
          className={`px-3 py-1 rounded ${activeTab === 'testlab' ? 'text-teal-400 bg-slate-800' : 'text-slate-400'}`}
        >
          {t.navTestLab}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('methodology')}
          className={`px-3 py-1 rounded ${activeTab === 'methodology' ? 'text-teal-400 bg-slate-800' : 'text-slate-400'}`}
        >
          {t.navMethodology}
        </button>
      </div>
    </header>
  );
};
