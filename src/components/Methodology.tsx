/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Layers,
  ArrowRight,
  Database,
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
    <div className="space-y-10 max-w-5xl mx-auto py-4">
      {/* 1. Header */}
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t.methodologyTitle}
        </h2>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          NaviFlow applies Multi-Attribute Utility Theory (MAUT) to Indian highway travel. Rather than hiding behind a black-box machine learning model, every score and recommendation is computed deterministically from verified geographic attributes.
        </p>
      </div>

      {/* 2. THE 5-LAYER PIPELINE ARCHITECTURE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-bold text-white">
            The 5-Layer Pipeline: Capture → Integrate → Score → Recommend → Validate
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Layer 1 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono font-bold text-teal-400 uppercase">
              Layer 1: Capture
            </span>
            <div className="font-bold text-slate-200 text-xs">Origin, Dest & Vehicle</div>
            <p className="text-[11px] text-slate-400">
              Photon typeahead with India boundary restriction (~68°–98°E, 6°–36°N), vehicle tank/battery specs, and chosen style.
            </p>
          </div>

          {/* Layer 2 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
              Layer 2: Integrate
            </span>
            <div className="font-bold text-slate-200 text-xs">TomTom &amp; OSRM Corridor Mining</div>
            <p className="text-[11px] text-slate-400">
              Generates traffic-aware candidate routes via TomTom Routing API (or OSRM fallback); executes 3km corridor buffer queries across Overpass mirrors for fuel, food, toilets, tolls, and EV chargers.
            </p>
          </div>

          {/* Layer 3 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
              Layer 3: Score
            </span>
            <div className="font-bold text-slate-200 text-xs">Multi-Criteria Matrix</div>
            <p className="text-[11px] text-slate-400">
              Normalizes Pareto minimums (minT/T, minC/C). Evaluates road smoothness, toll friction, and stop quality proxies.
            </p>
          </div>

          {/* Layer 4 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
              Layer 4: Recommend
            </span>
            <div className="font-bold text-slate-200 text-xs">Deterministic Ranking</div>
            <p className="text-[11px] text-slate-400">
              Highest composite score wins. Synthesizes clear comparative rationale against runner-up without AI hallucination.
            </p>
          </div>

          {/* Layer 5 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">
              Layer 5: Validate
            </span>
            <div className="font-bold text-slate-200 text-xs">Live Unit & Bounds Check</div>
            <p className="text-[11px] text-slate-400">
              Automated hermetic suite verifying weight sum conservation, float precision, and highway reachability.
            </p>
          </div>
        </div>
      </div>

      {/* 3. MATHEMATICAL SCORING FORMULA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-teal-400" />
          The Exact Mathematical Scoring Formulation
        </h3>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-teal-300 overflow-x-auto space-y-2">
          <div>Composite Score = (wT × TimeScore) + (wC × CostScore) + (wM × ComfortScore) + (wS × StopQualityScore)</div>
          <div className="text-slate-400">where:</div>
          <div className="text-slate-300">· TimeScore = min(TotalDuration_all_candidates) / TotalDuration_candidate</div>
          <div className="text-slate-300">· CostScore = min(TotalCost_all_candidates) / TotalCost_candidate</div>
          <div className="text-slate-300">· ComfortScore ∈ [0, 1] proxy based on expressway fraction, turns density, and toll friction</div>
          <div className="text-slate-300">· StopQualityScore ∈ [0, 1] proxy based on verified physical amenities (toilets, 24/7, lighting, EV kW)</div>
        </div>

        {/* Weights Matrix */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold">
                <th className="py-2 pr-3">Journey Style</th>
                <th className="py-2 px-3 text-right">Time Weight (wT)</th>
                <th className="py-2 px-3 text-right">Cost Weight (wC)</th>
                <th className="py-2 px-3 text-right">Comfort Weight (wM)</th>
                <th className="py-2 pl-3 text-right">Stop Quality Weight (wS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
              <tr>
                <td className="py-2 pr-3 font-sans font-bold text-slate-200">Default</td>
                <td className="py-2 px-3 text-right">35% (0.35)</td>
                <td className="py-2 px-3 text-right">25% (0.25)</td>
                <td className="py-2 px-3 text-right">20% (0.20)</td>
                <td className="py-2 pl-3 text-right">20% (0.20)</td>
              </tr>
              <tr className="text-teal-300 bg-teal-950/20">
                <td className="py-2 pr-3 font-sans font-bold">Fast</td>
                <td className="py-2 px-3 text-right">50% (0.50)</td>
                <td className="py-2 px-3 text-right">20% (0.20)</td>
                <td className="py-2 px-3 text-right">15% (0.15)</td>
                <td className="py-2 pl-3 text-right">15% (0.15)</td>
              </tr>
              <tr className="text-emerald-300 bg-emerald-950/20">
                <td className="py-2 pr-3 font-sans font-bold">Cheap</td>
                <td className="py-2 px-3 text-right">20% (0.20)</td>
                <td className="py-2 px-3 text-right">50% (0.50)</td>
                <td className="py-2 px-3 text-right">15% (0.15)</td>
                <td className="py-2 pl-3 text-right">15% (0.15)</td>
              </tr>
              <tr className="text-cyan-300 bg-cyan-950/20">
                <td className="py-2 pr-3 font-sans font-bold">Comfort</td>
                <td className="py-2 px-3 text-right">20% (0.20)</td>
                <td className="py-2 px-3 text-right">20% (0.20)</td>
                <td className="py-2 px-3 text-right">30% (0.30)</td>
                <td className="py-2 pl-3 text-right">30% (0.30)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PROXIES EXPLAINED (HOW WE SCORE) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-teal-400" />
          How We Score: Transparent Proxy Definitions
        </h3>
        <p className="text-xs text-slate-400">
          OpenStreetMap does not maintain user star ratings or restaurant reviews. <strong>NaviFlow never invents or fakes user review stars.</strong> Instead, we evaluate verifiable physical attributes recorded in the OSM spatial schema:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-slate-200">Comfort Score Proxy (0–100)</div>
            <ul className="text-slate-400 space-y-1 list-disc pl-4">
              <li><strong>Expressway ratio (30%):</strong> Access-controlled expressways eliminate opposing traffic and pedestrians.</li>
              <li><strong>Surface quality (25%):</strong> Paved asphalt road grades versus secondary highway vibrations.</li>
              <li><strong>Toll friction (15%):</strong> Frequent FASTag queues reduce steady cruising cadence.</li>
              <li><strong>Turns density (15%):</strong> Fewer sharp turns per 100km yields less driver fatigue.</li>
              <li><strong>Night-driving factor:</strong> Departs between 21:00 and 05:00 apply optical glare discount.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-slate-200">Stop Quality Proxy (0–100)</div>
            <ul className="text-slate-400 space-y-1 list-disc pl-4">
              <li><strong>Amenity completeness:</strong> Explicit presence of <code className="text-teal-400 font-mono">amenity=toilets</code>, food courts, and lit parking.</li>
              <li><strong>24/7 Hours:</strong> Tagged <code className="text-teal-400 font-mono">opening_hours=24/7</code> for night travel security.</li>
              <li><strong>Known Operator Brand:</strong> IndianOil SWAGAT, BPCL Ghar, Tata Power EZ, Jio-bp.</li>
              <li><strong>EV Fast Charging:</strong> Verified DC fast charger power (&gt;50 kW) and Open Charge Map operational status.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 5. LIMITATIONS & ETHICAL DISCLOSURES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Model Limitations & Assumptions
        </h3>

        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            1. <strong>Hand-Chosen Weights:</strong> While weights (35/25/20/20, etc.) are calibrated against real commuter priorities, individual driving tolerances vary. The live &quot;What If?&quot; switcher allows exploring other trade-offs.
          </p>
          <p>
            2. <strong>FASTag Concessionaire Toll Rates:</strong> FASTag toll fees are estimated from standard 4-lane / 6-lane NHAI tariffs and plaza count. Concessionaires on state expressways may apply specific surcharges.
          </p>
          <p>
            3. <strong>TomTom &amp; Free Tier Boundaries:</strong> NaviFlow utilizes TomTom Routing API (2,500 daily requests) with live traffic. If the daily quota is reached (429), it automatically engages the OSRM fallback engine with free-flow travel times (&quot;No live traffic&quot;).
          </p>
        </div>
      </div>

      {/* 6. SUSTAINABILITY (SDG 11 & SDG 9) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-teal-400" />
          Sustainable Development Goals (SDG Alignment)
        </h3>
        <p className="text-xs text-amber-400 italic">
          *Note: Alignment represents intended design impact, not empirically measured outcomes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-teal-300 block">UN SDG 11: Sustainable Cities & Communities</span>
            <p className="text-slate-400">
              Target 11.2: Providing access to safe, affordable, and sustainable transport systems by optimizing EV intercity long-distance transit and reducing unnecessary detour idling on Indian highways.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-cyan-300 block">UN SDG 9: Industry, Innovation & Infrastructure</span>
            <p className="text-slate-400">
              Target 9.1: Supporting high-quality, reliable, sustainable, and resilient transport infrastructure by utilizing open geospatial standards (OSM) to highlight verified roadside sanitation and EV hubs.
            </p>
          </div>
        </div>
      </div>

      {/* 7. FUTURE ROADMAP */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Milestone className="w-5 h-5 text-teal-400" />
          NaviFlow Future Roadmap
        </h3>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Phase 2: Live FASTag Toll Booth Queue Sensor Integration</strong>
              <p className="text-slate-400">Incorporate crowdsourced waiting times at key state border toll barriers.</p>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Phase 3: Topographic Elevation & EV Regen Braking Simulation</strong>
              <p className="text-slate-400">Simulate Ghat climbs (e.g. Khandala, Bhor Ghat, Charmadi) with elevation profile battery consumption.</p>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Phase 4: Real-time Monsoon Weather & Road Inundation Radar</strong>
              <p className="text-slate-400">Surface IMD weather alerts and waterlogging notifications along highway corridors.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
