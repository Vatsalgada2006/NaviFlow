/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Compass, ShieldCheck, Zap, Fuel, Navigation, Heart } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-sm">
              <Compass className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">About NaviFlow</h3>
              <p className="text-xs text-teal-400 font-mono">India Journey Intelligence Engine</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vision statement */}
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">The Decision Layer for Indian Roads</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Standard maps apps give lines on a map; toll calculators give toll fees; EV apps list chargers. <strong className="text-white">NaviFlow combines them all into ONE explained, actionable plan tailored for your specific vehicle:</strong> &quot;Route B: 9 min slower, ₹250 cheaper, better stops, and why.&quot;
          </p>
        </div>

        {/* Feature Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              <span>Fuel &amp; Energy Intelligence</span>
            </div>
            <p className="text-[11px] text-slate-400">
              State-specific retail prices for Petrol, Diesel, CNG, and ₹/kWh EV fast charging.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>EV Range Buffer Assurance</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pinpoints lowest buffer point along the highway corridor, scheduling verified 50kW+ chargers before reserve limits.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero Fake Ratings</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Evaluates objective facility presence (clean washrooms, 24/7 dining, lighting, secure parking) rather than unverified reviews.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-indigo-400" />
              <span>Safety &amp; Corridor Weather</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live Open-Meteo precipitation/heat alerts, along with 24/7 highway patrol chowkis, hospitals, and tyre repair points.
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-3 flex items-center justify-between">
          <span>Crafted for Indian road-trippers across national highway corridors.</span>
          <span className="font-mono">v1.0.0-PROD</span>
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
