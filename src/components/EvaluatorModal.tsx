/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Beaker, FileText, CheckCircle2 } from 'lucide-react';
import { TestLab } from './TestLab';
import { Methodology } from './Methodology';
import { Language } from '../utils/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const EvaluatorModal: React.FC<Props> = ({ isOpen, onClose, lang }) => {
  const [activeSubTab, setActiveSubTab] = useState<'testlab' | 'methodology'>('testlab');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0B101B] border border-slate-700 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111827] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Beaker className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Evaluator Intelligence Suite</h3>
                <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-mono font-bold">
                  EVALUATOR ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">Automated test runners, validation benchmarks, and algorithmic methodology</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sub-tabs */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveSubTab('testlab')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeSubTab === 'testlab'
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Beaker className="w-3.5 h-3.5" />
                <span>Test Lab (T1–T4)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('methodology')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeSubTab === 'methodology'
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Methodology &amp; Formulas</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeSubTab === 'testlab' ? (
            <TestLab lang={lang} />
          ) : (
            <Methodology lang={lang} />
          )}
        </div>
      </div>
    </div>
  );
};
