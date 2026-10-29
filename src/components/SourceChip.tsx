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

export const SourceChip: React.FC<Props> = ({
  source,
  fallbackType = 'Estimated',
  label,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const type: DataSourceType = source?.type || fallbackType;

  const colorStyles = {
    Live: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/60',
    'Web-sourced': 'bg-sky-950/40 text-sky-300 border-sky-500/30 hover:border-sky-500/60',
    Estimated: 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:border-amber-500/60',
  }[type];

  const Icon = {
    Live: CheckCircle2,
    'Web-sourced': Search,
    Estimated: Sliders,
  }[type];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border transition-all cursor-pointer ${colorStyles} ${className}`}
        aria-label={`Data source info for ${label || type}`}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span>{label ? `${label}: ${type}` : type}</span>
      </button>

      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-xl text-left text-xs pointer-events-none">
          <div className="flex items-center gap-1.5 font-semibold text-slate-100 mb-1">
            <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>Data Transparency</span>
          </div>
          <div className="text-slate-300 space-y-1">
            <p>
              <strong className="text-slate-200">Provider:</strong> {source?.provider || 'Formula / Reference Spec'}
            </p>
            {source?.timestamp && (
              <p>
                <strong className="text-slate-200">Freshness:</strong>{' '}
                {new Date(source.timestamp).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
            {source?.notes && <p className="text-slate-400 italic">{source.notes}</p>}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
        </div>
      )}
    </div>
  );
};
