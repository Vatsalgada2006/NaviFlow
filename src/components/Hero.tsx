/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Compass,
  ArrowRight,
  Route,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Database,
  Layers,
  Fuel,
  CreditCard,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface Props {
  onStartPlanning: () => void;
  onOpenDataSources: () => void;
  lang: Language;
}

export const Hero: React.FC<Props> = ({ onStartPlanning, onOpenDataSources, lang }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="space-y-12 py-4 sm:py-8 animate-in fade-in">
      {/* 1. Main Hero Headline Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-700/70 rounded-full text-xs font-semibold text-teal-300">
          <Compass className="w-3.5 h-3.5 text-teal-400" />
          <span>India Highway Intelligence · 100% Free Live APIs</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
          {t.heroTitle}
        </h1>

        <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
          {t.heroSubtitle}
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onStartPlanning}
            className="px-6 py-3 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2 cursor-pointer"
          >
            <span>{t.planJourneyBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenDataSources}
            className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Database className="w-4 h-4 text-teal-400" />
            <span>Inspect Live APIs</span>
          </button>
        </div>
      </div>

      {/* 2. "REPLACES 6 APPS" COMPARISON VISUAL */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-5xl mx-auto shadow-xl">
        <div className="text-center mb-6">
          <span className="text-xs font-extrabold text-teal-400 uppercase tracking-wider block mb-1">
            Consolidated Driver Intelligence
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white">{t.replaces6Apps}</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center text-xs">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <Route className="w-5 h-5 text-blue-400" />
            <div className="font-semibold text-slate-200">Google Maps</div>
            <span className="text-[10px] text-slate-400">Routes & Traffic</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-teal-400" />
            <div className="font-semibold text-slate-200">ABRP</div>
            <span className="text-[10px] text-slate-400">EV Range & Chargers</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <div className="font-semibold text-slate-200">FASTag Toll App</div>
            <span className="text-[10px] text-slate-400">Plaza Toll Fees</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <Fuel className="w-5 h-5 text-emerald-400" />
            <div className="font-semibold text-slate-200">FuelBuddy</div>
            <span className="text-[10px] text-slate-400">Live Fuel Rates</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div className="font-semibold text-slate-200">Park+</div>
            <span className="text-[10px] text-slate-400">Highway Amenities</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <div className="font-semibold text-slate-200">OSM Overpass</div>
            <span className="text-[10px] text-slate-400">Corridor Tag Mining</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
          <span className="text-teal-400 font-semibold">NaviFlow unifies all six:</span> One single query feeds TomTom traffic routing (with OSRM fallback), Overpass corridor filters, Open Charge Map, Gemini web-search grounding, and NHAI toll matrices into a single multi-attribute utility optimization.
        </div>
      </div>

      {/* 3. "HOW IT WORKS" 3-STEP STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-sm mb-3">
            1
          </div>
          <h3 className="font-bold text-slate-100 text-sm mb-1">{t.step1Title}</h3>
          <p className="text-xs text-slate-400">{t.step1Desc}</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm mb-3">
            2
          </div>
          <h3 className="font-bold text-slate-100 text-sm mb-1">{t.step2Title}</h3>
          <p className="text-xs text-slate-400">{t.step2Desc}</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm mb-3">
            3
          </div>
          <h3 className="font-bold text-slate-100 text-sm mb-1">{t.step3Title}</h3>
          <p className="text-xs text-slate-400">{t.step3Desc}</p>
        </div>
      </div>
    </div>
  );
};
