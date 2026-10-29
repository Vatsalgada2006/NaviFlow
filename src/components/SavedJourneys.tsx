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
  Zap,
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
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-teal-400" />
            {t.savedTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Persisted in browser offline storage. Access previously planned highway routes anytime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            disabled={savedList.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export JSON</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-teal-400" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved journeys by city or NH junction..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-lg text-xs">
          {['all', 'Petrol', 'Diesel', 'CNG', 'EV'].map((fuel) => (
            <button
              key={fuel}
              type="button"
              onClick={() => setFilterFuel(fuel)}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                filterFuel === fuel
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {fuel === 'all' ? 'All Fuels' : fuel}
            </button>
          ))}
        </div>
      </div>

      {/* List / Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-300 text-base">{t.savedEmpty}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Use the Journey Planner to optimize your trip between any two Indian cities, then tap &quot;Save Journey&quot; to store the route, planned stops, and offline telemetry here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item, idx) => {
            const recommended =
              item.candidates.find((c) => c.id === item.recommendedRouteId) || item.candidates[0];

            return (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-sm line-clamp-1">
                      {item.origin.name} → {item.destination.name}
                    </div>
                    <div className="text-[11px] text-teal-400 font-medium mt-0.5">
                      {recommended.name} ({item.journeyStyle} style)
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteJourney(idx)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    title="Delete saved journey"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Distance</span>
                    <span className="font-bold text-slate-200 tabular-nums">
                      {recommended.distanceKm} km
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Time</span>
                    <span className="font-bold text-slate-200 tabular-nums">
                      {Math.floor(recommended.totalDurationMinutes / 60)}h{' '}
                      {recommended.totalDurationMinutes % 60}m
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Est. Cost</span>
                    <span className="font-bold text-slate-200 tabular-nums">
                      ₹{recommended.totalCostInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Car className="w-3.5 h-3.5 text-slate-500" />
                    {item.vehicle.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => onOpenJourney(item)}
                    className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold text-xs cursor-pointer"
                  >
                    <span>Re-open Plan</span>
                    <ExternalLink className="w-3 h-3" />
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
