/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleResetAndClose();
      }}
    >
      <div className="bg-white dark:bg-[#1B1D1A] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 text-[#1C1B1A] dark:text-[#F5F4F0]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6E2DC] dark:border-[#2E302B] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F5A524]/15 text-[#B45309] dark:text-[#F5A524] rounded-xl">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <h3 id="report-modal-title" className="text-xl font-bold">
                Report Highway Information
              </h3>
              <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
                Help keep highway and toll data verified for Indian drivers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="min-h-[44px] min-w-[44px] p-2 text-[#5C5A57] hover:text-[#1C1B1A] dark:text-[#A8A29E] dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {successReportId ? (
          <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[#0B6B3A] dark:text-[#22C55E] mx-auto" />
            <h4 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
              Report Logged Successfully
            </h4>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              Your feedback helps keep highway tolls, EV charger uptime, and route conditions verified.
            </p>
            <p className="text-sm font-mono text-[#5C5A57] dark:text-[#A8A29E]">
              Report ID: {successReportId}
            </p>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="min-h-[44px] mt-2 px-6 py-2.5 bg-[#0B6B3A] hover:bg-[#08522C] text-white rounded-xl text-base font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Issue Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full min-h-[44px] bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3.5 py-2.5 text-base text-[#1C1B1A] dark:text-[#F5F4F0] focus:outline-none focus:border-[#0B6B3A]"
              >
                <option value="toll_rate_wrong">Toll Plaza Fee Incorrect or FASTag Issue</option>
                <option value="charger_offline">EV Charger Offline / Defective</option>
                <option value="fuel_unavailable">CNG or Fuel Unavailable at Station</option>
                <option value="road_closure">Highway Diversion / Unmapped Roadwork</option>
                <option value="inaccurate_time">Substantial Traffic Delay Discrepancy</option>
                <option value="other">Other Highway Amenity Change</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Plaza / Stop Name (Optional)
              </label>
              <input
                type="text"
                value={stopName}
                onChange={(e) => setStopName(e.target.value)}
                placeholder="e.g., Khalapur Toll Plaza or BPCL COCO Food Mall"
                className="w-full min-h-[44px] bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3.5 py-2.5 text-base text-[#1C1B1A] dark:text-[#F5F4F0] placeholder-[#5C5A57] dark:placeholder-[#A8A29E] focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Details
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what changed (e.g. car toll is now ₹320 instead of ₹280)..."
                className="w-full min-h-[80px] bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg p-3 text-base text-[#1C1B1A] dark:text-[#F5F4F0] placeholder-[#5C5A57] dark:placeholder-[#A8A29E] focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Contact Phone / Email (Optional)
              </label>
              <input
                type="text"
                value={userContact}
                onChange={(e) => setUserContact(e.target.value)}
                placeholder="Optional, for verification"
                className="w-full min-h-[44px] bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-lg px-3.5 py-2.5 text-base text-[#1C1B1A] dark:text-[#F5F4F0] placeholder-[#5C5A57] dark:placeholder-[#A8A29E] focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="min-h-[44px] flex-1 py-2.5 bg-[#FAF8F5] dark:bg-[#121311] hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E6E2DC] dark:border-[#2E302B] rounded-xl text-base font-semibold text-[#1C1B1A] dark:text-[#F5F4F0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] flex-1 py-2.5 bg-[#0B6B3A] hover:bg-[#08522C] text-white rounded-xl text-base font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Submit</span>
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
