/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Compass, RefreshCw, X } from 'lucide-react';

interface Props {
  onCancel?: () => void;
}

const PROGRESS_STAGES = [
  'Querying National Highway corridors...',
  'Checking live traffic flow and congestions...',
  'Scanning verified highway amenities & EV chargers...',
  'Evaluating toll plazas and road safety metrics...',
  'Computing transparent weighted scores...',
];

export const PlanningSkeleton: React.FC<Props> = ({ onCancel }) => {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIdx((prev) => (prev + 1) % PROGRESS_STAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 shadow-sm space-y-5 animate-pulse">
      {/* Top Header Status */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E6E2DC] dark:border-[#2E302B]">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E] animate-spin shrink-0" />
          <span className="font-semibold text-base text-[#1C1B1A] dark:text-[#F5F4F0]">
            Planning Journey (~10s)
          </span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] min-w-[44px] px-3 py-2 text-sm font-semibold text-[#5C5A57] dark:text-[#A8A29E] hover:text-[#1C1B1A] dark:hover:text-[#F5F4F0] flex items-center gap-1.5 cursor-pointer rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Progress Stage Text */}
      <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-[#0B6B3A] animate-ping shrink-0" />
        <p className="text-sm font-medium text-[#1C1B1A] dark:text-[#F5F4F0]">
          {PROGRESS_STAGES[stageIdx]}
        </p>
      </div>

      {/* Primary Key Figures Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-stone-100 dark:bg-stone-800/60 rounded-xl space-y-2">
          <div className="h-4 w-20 bg-stone-200 dark:bg-stone-700 rounded" />
          <div className="h-9 w-28 bg-stone-300 dark:bg-stone-600 rounded" />
          <div className="h-4 w-24 bg-stone-200 dark:bg-stone-700 rounded" />
        </div>
        <div className="p-4 bg-stone-100 dark:bg-stone-800/60 rounded-xl space-y-2">
          <div className="h-4 w-20 bg-stone-200 dark:bg-stone-700 rounded" />
          <div className="h-9 w-28 bg-stone-300 dark:bg-stone-600 rounded" />
          <div className="h-4 w-24 bg-stone-200 dark:bg-stone-700 rounded" />
        </div>
      </div>

      {/* Recommendation Badge & Reason Skeleton */}
      <div className="p-4 bg-stone-50 dark:bg-stone-800/30 border border-stone-200 dark:border-stone-800 rounded-xl space-y-3">
        <div className="h-5 w-48 bg-stone-200 dark:bg-stone-700 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-stone-200 dark:bg-stone-700 rounded" />
          <div className="h-4 w-5/6 bg-stone-200 dark:bg-stone-700 rounded" />
        </div>
      </div>

      {/* Stops Timeline Skeleton */}
      <div className="space-y-3 pt-2">
        <div className="h-5 w-32 bg-stone-200 dark:bg-stone-700 rounded" />
        <div className="space-y-3 pl-3 border-l-2 border-stone-200 dark:border-stone-700">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5 pl-2">
              <div className="h-4 w-40 bg-stone-200 dark:bg-stone-700 rounded" />
              <div className="h-3.5 w-60 bg-stone-150 dark:bg-stone-750 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
