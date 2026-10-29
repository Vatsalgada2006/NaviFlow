/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Settings,
  Sun,
  Moon,
  Monitor,
  Globe,
  Gauge,
  IndianRupee,
  ShieldCheck,
  Check,
  Save,
} from 'lucide-react';
import { Language, SUPPORTED_LANGUAGES, TRANSLATIONS } from '../utils/i18n';
import { STATE_FUEL_FALLBACK_TABLE } from '../engine/fuelFallback';

interface Props {
  onBack: () => void;
  lang: Language;
  onSelectLang: (l: Language) => void;
  isDashboardMode: boolean;
  onToggleDashboardMode: (val: boolean) => void;
  theme: 'auto' | 'light' | 'dark';
  onSelectTheme: (t: 'auto' | 'light' | 'dark') => void;
}

export const SettingsPage: React.FC<Props> = ({
  onBack,
  lang,
  onSelectLang,
  isDashboardMode,
  onToggleDashboardMode,
  theme,
  onSelectTheme,
}) => {
  const t = TRANSLATIONS[lang];

  // Configurable toll discount (default 25% for 24h return, labeled "Estimated, verify with NHAI")
  const [returnDiscountPercent, setReturnDiscountPercent] = useState<number>(25);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  // Editable Fuel Matrix State
  const [fuelTable, setFuelTable] = useState(STATE_FUEL_FALLBACK_TABLE);
  const [selectedStateIndex, setSelectedStateIndex] = useState(0);

  const handleSavePreferences = () => {
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#121311] text-[#1C1B1A] dark:text-[#F5F4F0] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header with Back Button */}
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[44px] px-3.5 py-2 bg-white dark:bg-[#1B1D1A] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
              <span>Back to Plan</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6 text-[#0B6B3A] dark:text-[#22C55E]" />
                <span>Application Settings</span>
              </h1>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Configure display preferences, language, fuel baselines, and highway toll discount rules
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSavePreferences}
            className="min-h-[44px] px-4 py-2 bg-[#0B6B3A] hover:bg-[#08522C] text-white rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{savedSettingsNotice ? 'Saved!' : 'Save'}</span>
          </button>
        </div>

        {/* 1. Theme Appearance */}
        <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
            <Sun className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
            <h3 className="text-lg font-bold">Theme Appearance</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onSelectTheme('auto')}
              className={`min-h-[48px] p-3 rounded-xl border text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all ${
                theme === 'auto'
                  ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-sm'
                  : 'bg-[#FAF8F5] dark:bg-[#121311] border-[#E6E2DC] dark:border-[#2E302B] text-[#5C5A57] dark:text-[#A8A29E]'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Auto (Day/Night)</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTheme('light')}
              className={`min-h-[48px] p-3 rounded-xl border text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all ${
                theme === 'light'
                  ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-sm'
                  : 'bg-[#FAF8F5] dark:bg-[#121311] border-[#E6E2DC] dark:border-[#2E302B] text-[#5C5A57] dark:text-[#A8A29E]'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light Mode</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTheme('dark')}
              className={`min-h-[48px] p-3 rounded-xl border text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all ${
                theme === 'dark'
                  ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-sm'
                  : 'bg-[#FAF8F5] dark:bg-[#121311] border-[#E6E2DC] dark:border-[#2E302B] text-[#5C5A57] dark:text-[#A8A29E]'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark Night Mode</span>
            </button>
          </div>
        </div>

        {/* 2. Language Selection */}
        <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
            <Globe className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
            <h3 className="text-lg font-bold">Highway Language</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SUPPORTED_LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => onSelectLang(item.code)}
                className={`min-h-[48px] p-3 rounded-xl border text-sm font-semibold cursor-pointer flex items-center justify-between transition-all ${
                  lang === item.code
                    ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-sm'
                    : 'bg-[#FAF8F5] dark:bg-[#121311] border-[#E6E2DC] dark:border-[#2E302B] text-[#1C1B1A] dark:text-[#F5F4F0]'
                }`}
              >
                <span>{item.nativeLabel}</span>
                <span className="text-sm font-normal opacity-80">({item.label})</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. In-Car Dashboard Mode */}
        <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
              <div>
                <h3 className="text-lg font-bold">In-Car Dashboard View</h3>
                <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                  Enlarges critical navigation numbers and contrast for windshield phone mount visibility
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={isDashboardMode}
              onChange={(e) => onToggleDashboardMode(e.target.checked)}
              className="w-6 h-6 rounded border-[#E6E2DC] text-[#0B6B3A] focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        {/* 4. Toll Rules Configuration */}
        <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
            <ShieldCheck className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
            <div>
              <h3 className="text-lg font-bold">FASTag Toll Concession Rule</h3>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Configurable return trip discount percentage (Estimated, verify with NHAI)
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#FAF8F5] dark:bg-[#121311] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold">Return Trip Concession (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={returnDiscountPercent}
                onChange={(e) => setReturnDiscountPercent(parseInt(e.target.value) || 25)}
                className="w-24 min-h-[44px] px-3 py-1.5 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg text-base font-bold text-center tabular-nums"
              />
            </div>
            <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
              Standard published NHAI rule grants ~25% concession on return journeys within 24 hours across FASTag electronic fee collection plazas.
            </p>
          </div>
        </div>

        {/* 5. Editable State Fuel Reference Matrix */}
        <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
            <IndianRupee className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
            <div>
              <h3 className="text-lg font-bold">State Fuel Reference Table</h3>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Fallback baseline prices dated 2026. Editable for local pump adjustments.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Select State to View or Edit</label>
              <select
                value={selectedStateIndex}
                onChange={(e) => setSelectedStateIndex(parseInt(e.target.value))}
                className="w-full min-h-[44px] bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3.5 py-2.5 text-base"
              >
                {fuelTable.map((s, idx) => (
                  <option key={s.state} value={idx}>
                    {s.state} (Petrol: ₹{s.petrolPerLiter}, Diesel: ₹{s.dieselPerLiter}, CNG: ₹{s.cngPerKg})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-sm font-medium mb-1">Petrol (₹/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={fuelTable[selectedStateIndex].petrolPerLiter}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 100;
                    const updated = [...fuelTable];
                    updated[selectedStateIndex] = { ...updated[selectedStateIndex], petrolPerLiter: val };
                    setFuelTable(updated);
                  }}
                  className="w-full min-h-[44px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3.5 py-2 text-base tabular-nums"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Diesel (₹/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={fuelTable[selectedStateIndex].dieselPerLiter}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 90;
                    const updated = [...fuelTable];
                    updated[selectedStateIndex] = { ...updated[selectedStateIndex], dieselPerLiter: val };
                    setFuelTable(updated);
                  }}
                  className="w-full min-h-[44px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3.5 py-2 text-base tabular-nums"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">CNG (₹/kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={fuelTable[selectedStateIndex].cngPerKg}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 80;
                    const updated = [...fuelTable];
                    updated[selectedStateIndex] = { ...updated[selectedStateIndex], cngPerKg: val };
                    setFuelTable(updated);
                  }}
                  className="w-full min-h-[44px] bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3.5 py-2 text-base tabular-nums"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
