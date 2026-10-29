/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { JourneyPlanResult } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';
import {
  Bookmark,
  Search,
  Trash2,
  ExternalLink,
  Download,
  Upload,
  Calendar,
  Clock,
  IndianRupee,
  Car,
} from 'lucide-react';

interface Props {
  savedList: JourneyPlanResult[];
  onOpenJourney: (plan: JourneyPlanResult) => void;
  onDeleteJourney: (index: number) => void;
  onImportJourneys: (list: JourneyPlanResult[]) => void;
  lang: Language;
}

export const SavedJourneys: React.FC<Props> = ({
  savedList,
  onOpenJourney,
  onDeleteJourney,
  onImportJourneys,
  lang,
}) => {
  const t = TRANSLATIONS[lang];
  const [search, setSearch] = useState('');
  const [filterFuel, setFilterFuel] = useState<string>('all');

  const filtered = savedList.filter((item) => {
    const matchesSearch =
      item.origin.name.toLowerCase().includes(search.toLowerCase()) ||
      item.destination.name.toLowerCase().includes(search.toLowerCase());
    const matchesFuel = filterFuel === 'all' || item.vehicle.fuelType === filterFuel;
    return matchesSearch && matchesFuel;
  });

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(savedList, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naviflow-saved-journeys-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportJourneys(parsed);
        }
      } catch {
        console.warn('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5 py-2">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E2DC] dark:border-[#2E302B] pb-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Saved Journeys</span>
          </h2>
          <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] mt-0.5">
            Persisted in browser offline storage. Access previously planned highway routes anytime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            disabled={savedList.length === 0}
            className="min-h-[44px] flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#1B1D1A] hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 text-[#1C1B1A] dark:text-[#F5F4F0] text-sm font-semibold rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Export JSON</span>
          </button>

          <label className="min-h-[44px] flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#1B1D1A] hover:bg-stone-100 dark:hover:bg-stone-800 text-[#1C1B1A] dark:text-[#F5F4F0] text-sm font-semibold rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#5C5A57] dark:text-[#A8A29E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved cities or checkpoints..."
            className="w-full min-h-[44px] pl-10 pr-3 py-2 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-sm text-[#1C1B1A] dark:text-[#F5F4F0] placeholder-[#5C5A57] dark:placeholder-[#A8A29E] focus:outline-none focus:border-[#0B6B3A]"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#1B1D1A] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B]">
          {(['all', 'Petrol', 'Diesel', 'CNG', 'EV'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterFuel(f)}
              className={`min-h-[38px] px-3 py-1 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                filterFuel === f
                  ? 'bg-[#0B6B3A] text-white shadow-sm'
                  : 'text-[#5C5A57] dark:text-[#A8A29E] hover:text-[#1C1B1A] dark:hover:text-[#F5F4F0]'
              }`}
            >
              {f === 'all' ? 'All Fuels' : f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#1B1D1A] rounded-2xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-2">
          <Bookmark className="w-10 h-10 text-[#5C5A57] dark:text-[#A8A29E] mx-auto opacity-50" />
          <h4 className="text-base font-bold">No saved journeys found</h4>
          <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
            Plan a route and tap &quot;Save Trip&quot; to keep your frequent highway itineraries here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, idx) => {
            const bestRoute =
              item.candidates.find((c) => c.id === item.recommendedRouteId) || item.candidates[0];

            return (
              <div
                key={`saved-${idx}`}
                className="p-4 bg-white dark:bg-[#1B1D1A] rounded-2xl border border-[#E6E2DC] dark:border-[#2E302B] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-[#1C1B1A] dark:text-[#F5F4F0]">
                      {item.origin.name.split(',')[0]} → {item.destination.name.split(',')[0]}
                    </span>
                    <span className="px-2 py-0.5 bg-[#FAF8F5] dark:bg-[#121311] text-[#0B6B3A] dark:text-[#22C55E] text-sm font-semibold rounded border border-[#E6E2DC] dark:border-[#2E302B]">
                      {item.journeyStyle}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                    <span className="flex items-center gap-1 font-semibold text-[#1C1B1A] dark:text-[#F5F4F0]">
                      <IndianRupee className="w-4 h-4 text-[#0B6B3A] dark:text-[#22C55E]" />
                      <span>₹{bestRoute.totalCostInr.toLocaleString('en-IN')}</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {Math.floor(bestRoute.totalDurationMinutes / 60)}h {bestRoute.totalDurationMinutes % 60}m
                      </span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Car className="w-4 h-4" />
                      <span>{item.vehicle.name}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenJourney(item)}
                    className="min-h-[44px] px-4 py-2 bg-[#0B6B3A] hover:bg-[#08522C] text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>View Plan</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteJourney(idx)}
                    className="min-h-[44px] min-w-[44px] p-2 text-[#5C5A57] hover:text-[#DC2626] dark:text-[#A8A29E] dark:hover:text-red-400 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer flex items-center justify-center"
                    aria-label="Delete saved journey"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
