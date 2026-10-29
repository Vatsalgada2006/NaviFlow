/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Layers,
  Cpu,
  Award,
  AlertTriangle,
  Globe2,
  Milestone,
  CheckCircle,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface Props {
  lang: Language;
}

export const Methodology: React.FC<Props> = ({ lang }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2 text-[#1C1B1A] dark:text-[#F5F4F0]">
      {/* 1. Header */}
      <div className="space-y-2 border-b border-[#E6E2DC] dark:border-[#2E302B] pb-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B6B3A] dark:text-[#22C55E]">
          {t.methodologyTitle}
        </h2>
        <p className="text-base text-[#5C5A57] dark:text-[#A8A29E] max-w-3xl leading-relaxed">
          NaviFlow applies Multi-Attribute Utility Theory (MAUT) to Indian highway travel. Every score, ranking, and recommendation is calculated deterministically from verified spatial data and transparent user-weighted priorities.
        </p>
      </div>

      {/* 2. THE 5-LAYER PIPELINE ARCHITECTURE */}
      <div className="bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
          <h3 className="text-lg font-bold">
            The 5-Layer Pipeline: Capture → Integrate → Score → Recommend → Validate
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Layer 1 */}
          <div className="bg-white dark:bg-[#1B1D1A] p-4 rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-2">
            <span className="text-sm font-mono font-bold text-[#0B6B3A] dark:text-[#22C55E] uppercase block">
              Layer 1: Capture
            </span>
            <div className="font-bold text-base">Origin, Dest &amp; Vehicle</div>
            <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
              Photon typeahead with India boundary restriction (68°–98°E, 6.5°–35.5°N), vehicle powertrain specs, and style policy.
            </p>
          </div>

          {/* Layer 2 */}
          <div className="bg-white dark:bg-[#1B1D1A] p-4 rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-2">
            <span className="text-sm font-mono font-bold text-[#0B6B3A] dark:text-[#22C55E] uppercase block">
              Layer 2: Integrate
            </span>
            <div className="font-bold text-base">Corridor Geometry &amp; Stops</div>
            <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
              Generates traffic-aware highway routes; scans verified highway amenities (fuel, food, washrooms, tolls, EV chargers).
            </p>
          </div>

          {/* Layer 3 */}
          <div className="bg-white dark:bg-[#1B1D1A] p-4 rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-2">
            <span className="text-sm font-mono font-bold text-[#F5A524] uppercase block">
              Layer 3: Score
            </span>
            <div className="font-bold text-base">Multi-Criteria Matrix</div>
            <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
              Normalizes Pareto minimums (minT/T, minC/C). Evaluates road smoothness, toll friction, and stop quality scores.
            </p>
          </div>

          {/* Layer 4 */}
          <div className="bg-white dark:bg-[#1B1D1A] p-4 rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-2">
            <span className="text-sm font-mono font-bold text-[#0B6B3A] dark:text-[#22C55E] uppercase block">
              Layer 4: Recommend
            </span>
            <div className="font-bold text-base">Deterministic Ranking</div>
            <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
              Highest composite score wins. Synthesizes comparative trade-off rationale against runner-up without AI hallucination.
            </p>
          </div>

          {/* Layer 5 */}
          <div className="bg-white dark:bg-[#1B1D1A] p-4 rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-2">
            <span className="text-sm font-mono font-bold text-[#0B6B3A] dark:text-[#22C55E] uppercase block">
              Layer 5: Validate
            </span>
            <div className="font-bold text-base">Physical Sanity Checks</div>
            <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
              Server-side assertions verifying distance within ±15%, positive time, non-negative costs, and timeline monotonicity.
            </p>
          </div>
        </div>
      </div>

      {/* 3. MATHEMATICAL SCORING FORMULA */}
      <div className="bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
          <span>The Exact Mathematical Scoring Formulation</span>
        </h3>

        <div className="p-4 bg-white dark:bg-[#1B1D1A] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] font-mono text-sm overflow-x-auto space-y-2 leading-relaxed">
          <div className="font-bold text-[#0B6B3A] dark:text-[#22C55E]">
            Composite Score = (wT × TimeScore) + (wC × CostScore) + (wM × ComfortScore) + (wS × StopQualityScore)
          </div>
          <div className="text-[#5C5A57] dark:text-[#A8A29E]">where:</div>
          <div>· TimeScore = min(TotalDuration across candidates) / TotalDuration_candidate</div>
          <div>· CostScore = min(TotalCost across candidates) / TotalCost_candidate</div>
          <div>· ComfortScore ∈ [0, 1] proxy based on expressway fraction, turns density, and toll friction</div>
          <div>· StopQualityScore ∈ [0, 1] proxy based on verified physical amenities (toilets, 24/7, lighting, EV kW)</div>
        </div>

        {/* Weights Matrix */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6E2DC] dark:border-[#2E302B] text-[#5C5A57] dark:text-[#A8A29E] font-bold">
                <th className="py-2.5 pr-3">Journey Style</th>
                <th className="py-2.5 px-3 text-right">Time Weight (wT)</th>
                <th className="py-2.5 px-3 text-right">Cost Weight (wC)</th>
                <th className="py-2.5 px-3 text-right">Comfort Weight (wM)</th>
                <th className="py-2.5 pl-3 text-right">Stop Quality Weight (wS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2DC] dark:divide-[#2E302B] font-mono">
              <tr>
                <td className="py-2.5 pr-3 font-sans font-bold">Default</td>
                <td className="py-2.5 px-3 text-right">35% (0.35)</td>
                <td className="py-2.5 px-3 text-right">25% (0.25)</td>
                <td className="py-2.5 px-3 text-right">20% (0.20)</td>
                <td className="py-2.5 pl-3 text-right">20% (0.20)</td>
              </tr>
              <tr className="bg-[#0B6B3A]/5 font-semibold text-[#0B6B3A] dark:text-[#22C55E]">
                <td className="py-2.5 pr-3 font-sans font-bold">Fast</td>
                <td className="py-2.5 px-3 text-right">50% (0.50)</td>
                <td className="py-2.5 px-3 text-right">20% (0.20)</td>
                <td className="py-2.5 px-3 text-right">15% (0.15)</td>
                <td className="py-2.5 pl-3 text-right">15% (0.15)</td>
              </tr>
              <tr className="bg-amber-50 dark:bg-amber-950/20 font-semibold text-[#B45309] dark:text-[#F5A524]">
                <td className="py-2.5 pr-3 font-sans font-bold">Cheap</td>
                <td className="py-2.5 px-3 text-right">20% (0.20)</td>
                <td className="py-2.5 px-3 text-right">50% (0.50)</td>
                <td className="py-2.5 px-3 text-right">15% (0.15)</td>
                <td className="py-2.5 pl-3 text-right">15% (0.15)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-sans font-bold">Comfort</td>
                <td className="py-2.5 px-3 text-right">20% (0.20)</td>
                <td className="py-2.5 px-3 text-right">20% (0.20)</td>
                <td className="py-2.5 px-3 text-right">30% (0.30)</td>
                <td className="py-2.5 pl-3 text-right">30% (0.30)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PROXIES EXPLAINED (HOW WE SCORE) */}
      <div className="bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Award className="w-5 h-5 text-[#0B6B3A] dark:text-[#22C55E]" />
          <span>How We Score: Transparent Proxy Definitions</span>
        </h3>
        <p className="text-sm text-[#5C5A57] dark:text-[#A8A29E]">
          OpenStreetMap does not maintain user star ratings or restaurant reviews. <strong>NaviFlow never invents or fakes user review stars.</strong> Instead, we evaluate verifiable physical attributes recorded in the spatial schema:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-white dark:bg-[#1B1D1A] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-2">
            <div className="font-bold text-base text-[#0B6B3A] dark:text-[#22C55E]">Comfort Score Proxy (0–100)</div>
            <ul className="text-[#5C5A57] dark:text-[#A8A29E] space-y-1.5 list-disc pl-4">
              <li><strong>Expressway ratio (30%):</strong> Access-controlled expressways eliminate opposing traffic and pedestrians.</li>
              <li><strong>Surface quality (25%):</strong> Paved asphalt road grades versus secondary highway vibrations.</li>
              <li><strong>Toll friction (15%):</strong> Frequent FASTag queues reduce steady cruising cadence.</li>
              <li><strong>Turns density (15%):</strong> Fewer sharp turns per 100km yields less driver fatigue.</li>
              <li><strong>Night-driving factor:</strong> Departures between 21:00 and 05:00 apply optical glare discount.</li>
            </ul>
          </div>

          <div className="p-4 bg-white dark:bg-[#1B1D1A] rounded-xl border border-[#E6E2DC] dark:border-[#2E302B] space-y-2">
            <div className="font-bold text-base text-[#0B6B3A] dark:text-[#22C55E]">Stop Quality Proxy (0–100)</div>
            <ul className="text-[#5C5A57] dark:text-[#A8A29E] space-y-1.5 list-disc pl-4">
              <li><strong>Amenity completeness:</strong> Explicit presence of verified clean toilets, food courts, and lit parking.</li>
              <li><strong>24/7 Hours:</strong> Verified round-the-clock service tags for night travel security.</li>
              <li><strong>Known Operator Brand:</strong> IndianOil SWAGAT, BPCL Ghar, Tata Power EZ, Jio-bp pulse.</li>
              <li><strong>EV Fast Charging:</strong> Verified DC fast charger power (≥50 kW) and operational connector registry status.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 5. LIMITATIONS & ETHICAL DISCLOSURES */}
      <div className="bg-[#FAF8F5] dark:bg-[#121311] border border-[#E6E2DC] dark:border-[#2E302B] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-[#EA580C]">
          <AlertTriangle className="w-5 h-5 text-[#EA580C]" />
          <span>Model Limitations &amp; Assumptions</span>
        </h3>

        <div className="space-y-2.5 text-sm text-[#5C5A57] dark:text-[#A8A29E] leading-relaxed">
          <p>
            1. <strong>Hand-Chosen Weights:</strong> While weights (35/25/20/20, etc.) are calibrated against real commuter priorities, individual driving tolerances vary. The dynamic style switcher allows exploring other trade-offs.
          </p>
          <p>
            2. <strong>FASTag Concessionaire Toll Rates:</strong> FASTag toll fees are estimated from standard 4-lane / 6-lane NHAI tariffs and plaza count. Concessionaires on state expressways may apply specific surcharges.
          </p>
          <p>
            3. <strong>Live Traffic &amp; Free Tier Boundaries:</strong> NaviFlow utilizes traffic-aware routing with automatic secondary fallback to normal highway travel times (&quot;No live traffic&quot;) if rate limits or quota boundaries are encountered.
          </p>
        </div>
      </div>
    </div>
  );
};
