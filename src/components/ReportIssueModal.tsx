/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Flag, Send, RefreshCw } from 'lucide-react';
import { IssueReportPayload } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  originName?: string;
  destinationName?: string;
  routeId?: string;
}

export const ReportIssueModal: React.FC<Props> = ({
  isOpen,
  onClose,
  originName = '',
  destinationName = '',
  routeId = '',
}) => {
  const [category, setCategory] = useState<IssueReportPayload['category']>('toll_rate_wrong');
  const [description, setDescription] = useState('');
  const [stopName, setStopName] = useState('');
  const [userContact, setUserContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReportId, setSuccessReportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage('Please provide details about what is inaccurate or changed.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originName,
          destinationName,
          routeId,
          stopName: stopName.trim() || undefined,
          category,
          description: description.trim(),
          userContact: userContact.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setSuccessReportId(data.reportId || 'logged');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccessReportId(null);
    setDescription('');
    setStopName('');
    setUserContact('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Report Highway Information Issue</h3>
              <p className="text-xs text-slate-400">Help keep Indian highway data accurate for fellow road-trippers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successReportId ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Report Successfully Received</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Thank you! Your report (Ref: <code className="text-teal-400">{successReportId}</code>) has been recorded in the NaviFlow highway verification buffer.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Route context */}
            {(originName || destinationName) && (
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Corridor: <strong className="text-slate-200">{originName || 'Origin'}</strong> → <strong className="text-slate-200">{destinationName || 'Dest'}</strong></span>
                <span className="text-teal-400 font-mono">Live Route</span>
              </div>
            )}

            {/* Category Select */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-teal-400"
              >
                <option value="toll_rate_wrong">FASTag Toll Plaza Fee Discrepancy</option>
                <option value="charger_offline">EV Charger Broken / Inaccessible</option>
                <option value="fuel_unavailable">Fuel / CNG Station Out of Stock or Closed</option>
                <option value="road_closure">Road Diversion / Expressway Construction</option>
                <option value="inaccurate_time">Inaccurate Travel Time / Bottleneck Delay</option>
                <option value="other">Other Highway Info Feedback</option>
              </select>
            </div>

            {/* Specific Stop Name (Optional) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Specific Plaza or Stop Name (Optional)</label>
              <input
                type="text"
                value={stopName}
                onChange={(e) => setStopName(e.target.value)}
                placeholder="e.g. Khalapur Toll Plaza, BPCL Ghar Lonavala"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Description of Issue *</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what changed (e.g. FASTag rate updated to ₹320, 60kW charger is non-functional)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 resize-none"
                required
              />
            </div>

            {/* Optional contact */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email or Phone (Optional for follow-up)</label>
              <input
                type="text"
                value={userContact}
                onChange={(e) => setUserContact(e.target.value)}
                placeholder="Optional contact info"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-3.5 py-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
