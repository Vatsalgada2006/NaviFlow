/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Award, ShieldAlert, CheckCircle, Scale, Fuel, Zap, Clock, IndianRupee } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HowWeScoreModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">How NaviFlow Scores Routes</h3>
              <p className="text-xs text-slate-400">Objective, transparent, mathematical decision science</p>
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

        {/* Section 1: No Fake Ratings */}
        <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs sm:text-sm">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Zero Fake Ratings Policy</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            OpenStreetMap and highway databases do not maintain verified 5-star user reviews. Unlike other apps that fabricate star ratings, NaviFlow computes an objective <strong className="text-white">Stop Quality Score (0–1.0)</strong> based strictly on verified facility completeness.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Clean Washrooms (+15%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Food Plaza / Dining (+15%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>24/7 Operating Hours (+15%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Secured Parking (+10%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trusted COCO Brand (+10%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>EV Fast Charger ≥50kW (+25%)</span>
            </div>
          </div>
        </div>

        {/* Section 2: Multi-Attribute Utility Function */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
            Multi-Attribute Utility Function
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Each candidate route is normalized across four continuous dimensions and combined using preference weights:
          </p>

          <div className="space-y-2.5 text-xs font-mono">
            {/* Fast Policy */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-teal-300 font-bold mb-1">
                <span>Fast Journey Policy</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-teal-950 text-teal-300 rounded font-sans">Default</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Score = (0.50 × Time) + (0.20 × Cost) + (0.15 × Comfort) + (0.15 × Stop Quality)
              </div>
            </div>

            {/* Cheap Policy */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-emerald-300 font-bold mb-1">
                <span>Cheap Journey Policy</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Score = (0.50 × Cost) + (0.20 × Time) + (0.15 × Comfort) + (0.15 × Stop Quality)
              </div>
            </div>

            {/* Comfort Policy */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-indigo-300 font-bold mb-1">
                <span>Comfort Journey Policy</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Score = (0.30 × Comfort) + (0.30 × Stop Quality) + (0.20 × Time) + (0.20 × Cost)
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Comfort Proxy */}
        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="font-semibold text-white">How Comfort is Computed</div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Comfort incorporates: (1) Expressway fraction with access-control, (2) Turn frequency per 100 km (less turning fatigue), (3) FASTag toll friction, (4) Road surface smoothness, and (5) A 15% fatigue penalty for overnight departure windows.
          </p>
        </div>

        <div className="text-right pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
