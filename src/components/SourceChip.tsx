/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SourceAttribution, DataSourceType } from '../types';
import { Info, CheckCircle2, Search, Sliders } from 'lucide-react';

interface Props {
  source?: SourceAttribution;
  fallbackType?: DataSourceType;
  label?: string;
  className?: string;
}

// Cleans provider strings to ensure no backend brand names appear in user UI
function sanitizeProviderName(raw?: string): string {
  if (!raw) return 'Transparent Highway Matrix';
  const lower = raw.toLowerCase();
  if (lower.includes('tomtom')) return 'Live Traffic Feed';
  if (lower.includes('osrm')) return 'Road Network Alignment';
  if (lower.includes('open-meteo') || lower.includes('openmeteo')) return 'Live Weather Radar';
  if (lower.includes('overpass') || lower.includes('osm')) return 'National Road Infrastructure Database';
  if (lower.includes('ocm') || lower.includes('open charge map')) return 'EV Charger Registry';
  if (lower.includes('gemini') || lower.includes('google search')) return 'Live Indian Retail Energy Index';
  if (lower.includes('photon') || lower.includes('nominatim')) return 'India Geocoding Index';
  return raw;
}

export const SourceChip: React.FC<Props> = ({
  source,
  fallbackType = 'Estimated',
  label,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const type: DataSourceType = source?.type || fallbackType;

  const colorStyles = {
    Live: 'bg-[#0B6B3A]/10 text-[#0B6B3A] dark:text-[#22C55E] border-[#0B6B3A]/30 hover:border-[#0B6B3A]/60',
    'Web-sourced': 'bg-[#1C1B1A]/5 dark:bg-[#F5F4F0]/10 text-[#1C1B1A] dark:text-[#F5F4F0] border-[#E6E2DC] dark:border-[#2E302B]',
    Estimated: 'bg-[#F5A524]/15 text-[#92400E] dark:text-[#F5A524] border-[#F5A524]/40 hover:border-[#F5A524]/70',
  }[type];

  const Icon = {
    Live: CheckCircle2,
    'Web-sourced': Search,
    Estimated: Sliders,
  }[type];

  const cleanProvider = sanitizeProviderName(source?.provider);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded border transition-all cursor-pointer ${colorStyles} ${className}`}
        aria-label={`Data source info for ${label || type}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{label ? `${label}: ${type}` : type}</span>
      </button>

      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg shadow-xl text-left text-sm text-[#1C1B1A] dark:text-[#F5F4F0] pointer-events-none">
          <div className="flex items-center gap-1.5 font-semibold text-[#0B6B3A] dark:text-[#22C55E] mb-1">
            <Info className="w-4 h-4 shrink-0" />
            <span>Data Transparency</span>
          </div>
          <div className="space-y-1 text-sm text-[#5C5A57] dark:text-[#A8A29E]">
            <p>
              <strong className="text-[#1C1B1A] dark:text-[#F5F4F0]">Source:</strong> {cleanProvider}
            </p>
            {source?.timestamp && (
              <p>
                <strong className="text-[#1C1B1A] dark:text-[#F5F4F0]">Freshness:</strong>{' '}
                {new Date(source.timestamp).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
            {source?.notes && <p className="italic text-sm">{source.notes}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
