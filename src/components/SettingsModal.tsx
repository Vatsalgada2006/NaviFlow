/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Settings, Globe, Gauge, Moon, Sun, Monitor } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectLang: (l: Language) => void;
  isDashboardMode: boolean;
  onToggleDashboardMode: (val: boolean) => void;
  theme: 'auto' | 'light' | 'dark';
  onSelectTheme: (t: 'auto' | 'light' | 'dark') => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lang,
  onSelectLang,
  isDashboardMode,
  onToggleDashboardMode,
  theme,
  onSelectTheme,
}) => {
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">{t.navSettings}</h3>
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

        <div className="space-y-4 text-xs">
          {/* Theme Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Theme Appearance</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSelectTheme('auto')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 ${
                  theme === 'auto'
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Auto (Day/Night)</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTheme('light')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 ${
                  theme === 'light'
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTheme('dark')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 ${
                  theme === 'dark'
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Auto switches between clean day and dark night maps automatically.
            </p>
          </div>

          {/* In-Car Dashboard High Contrast Mode */}
          <div className="space-y-1.5 pt-3 border-t border-slate-800">
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
              Large high-contrast display with giant fonts for glanceable mounting in vehicles.
            </p>
          </div>

          {/* Language Selector */}
          <div className="space-y-1.5 pt-3 border-t border-slate-800">
            <label className="text-slate-300 font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-400" />
              <span>Language / भाषा</span>
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

          {/* Units */}
          <div className="space-y-1.5 pt-3 border-t border-slate-800">
            <label className="text-slate-300 font-semibold block">Units &amp; Locale Standard</label>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 space-y-1 text-[11px] font-mono">
              <div>Distance: Kilometers (km)</div>
              <div>Economy: km/L (Fuel) / km/kWh (EV) / km/kg (CNG)</div>
              <div>Currency: Indian Rupee (₹, INR, en-IN standard)</div>
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
