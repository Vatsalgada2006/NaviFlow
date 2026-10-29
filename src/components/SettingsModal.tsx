/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Settings, Globe, Gauge, Moon, Monitor } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectLang: (l: Language) => void;
  isDashboardMode: boolean;
  onToggleDashboardMode: (val: boolean) => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lang,
  onSelectLang,
  isDashboardMode,
  onToggleDashboardMode,
}) => {
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-400" />
            <h3 className="text-lg font-bold text-white">{t.navSettings}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 text-xs">
          {/* Language Selector */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-400" />
              <span>Language / भाषा:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSelectLang('en')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                  lang === 'en'
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                English (en-IN)
              </button>
              <button
                type="button"
                onClick={() => onSelectLang('hi')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                  lang === 'hi'
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>

          {/* In-Car Dashboard High Contrast Mode */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-2">
                <Gauge className="w-4 h-4 text-teal-400" />
                <span>{t.dashboardMode}</span>
              </label>
              <input
                type="checkbox"
                checked={isDashboardMode}
                onChange={(e) => onToggleDashboardMode(e.target.checked)}
                className="w-4 h-4 accent-teal-400 rounded cursor-pointer"
              />
            </div>
            <p className="text-slate-400 text-[11px]">
              Boosts contrast and saturates map layer tiles for vehicle-mounted phone holders in bright daylight or night drives.
            </p>
          </div>

          {/* Units */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <label className="text-slate-300 font-semibold block">Units &amp; Locale:</label>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 space-y-1 text-[11px] font-mono">
              <div>Distance: Kilometers (km)</div>
              <div>Economy: km/L (Fuel) / km/kWh (EV) / km/kg (CNG)</div>
              <div>Currency: Indian Rupee (₹, INR, en-IN format)</div>
              <div>Time Zone: Asia/Kolkata (IST, UTC+5:30)</div>
            </div>
          </div>
        </div>

        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
