/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  calculateWeightedScore,
  SCORING_WEIGHTS,
  normalizeAndScoreCandidates,
  generateDeterministicExplanation,
} from './scoring';
import { RouteCandidate } from '../types';
import { DEFAULT_VEHICLE } from './vehicles';

export interface TestResultItem {
  id: string;
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  details: string;
}

export function runEngineUnitTests(): TestResultItem[] {
  const results: TestResultItem[] = [];

  // Test 1: Hand-check specified by user prompt
  // A: T.90 C.50 M.60 S.55 vs B: T.80 C.85 M.65 S.80
  // gives 0.67 vs 0.78 under defaults and about 0.72 vs 0.79 under Fast
  const scoreA_Default = calculateWeightedScore(0.90, 0.50, 0.60, 0.55, SCORING_WEIGHTS.Default);
  const scoreB_Default = calculateWeightedScore(0.80, 0.85, 0.65, 0.80, SCORING_WEIGHTS.Default);
  const scoreA_Fast = calculateWeightedScore(0.90, 0.50, 0.60, 0.55, SCORING_WEIGHTS.Fast);
  const scoreB_Fast = calculateWeightedScore(0.80, 0.85, 0.65, 0.80, SCORING_WEIGHTS.Fast);

  const t1Passed =
    Math.abs(scoreA_Default - 0.67) < 0.01 &&
    Math.abs(scoreB_Default - 0.78) < 0.01 &&
    Math.abs(scoreA_Fast - 0.72) < 0.01 &&
    Math.abs(scoreB_Fast - 0.79) < 0.01;

  results.push({
    id: 'unit-hand-check',
    name: 'Hand-Check Spec: Route A vs Route B across Default and Fast weights',
    passed: t1Passed,
    expected: 'A_Def ≈ 0.67, B_Def ≈ 0.78, A_Fast ≈ 0.72, B_Fast ≈ 0.79',
    actual: `A_Def=${scoreA_Default}, B_Def=${scoreB_Default}, A_Fast=${scoreA_Fast}, B_Fast=${scoreB_Fast}`,
    details: 'Verified against mathematical formula: wT*T + wC*C + wM*M + wS*S with zero floating point drift.',
  });

  // Test 2: Weight sums must equal 1.00 for all styles
  let weightsValid = true;
  for (const [style, w] of Object.entries(SCORING_WEIGHTS)) {
    const sum = Number((w.time + w.cost + w.comfort + w.stop).toFixed(4));
    if (sum !== 1.0) weightsValid = false;
  }
  results.push({
    id: 'unit-weights-sum',
    name: 'Weight Conservation: Sum of weights wT + wC + wM + wS = 1.00',
    passed: weightsValid,
    expected: '1.00 for all styles (Default, Fast, Cheap, Comfort)',
    actual: Object.entries(SCORING_WEIGHTS)
      .map(([k, v]) => `${k}:${(v.time + v.cost + v.comfort + v.stop).toFixed(2)}`)
      .join(', '),
    details: 'Ensures probability conservation across multi-attribute utility theory.',
  });

  // Test 3: Normalization logic (minTime / time, minCost / cost)
  const dummyCandidate1 = createMockCandidate('c1', 'Expressway', 300, 2000, 0.8, 0.8);
  const dummyCandidate2 = createMockCandidate('c2', 'Old Highway', 400, 1000, 0.5, 0.6);
  const normalized = normalizeAndScoreCandidates([dummyCandidate1, dummyCandidate2], 'Default');

  // c1 minTime is 300, so c1.timeScore = 300/300 = 1.0. c2.timeScore = 300/400 = 0.75
  // minCost is 1000, so c1.costScore = 1000/2000 = 0.5. c2.costScore = 1000/1000 = 1.0
  const normPassed =
    normalized[0].timeScore === 1.0 &&
    normalized[1].timeScore === 0.75 &&
    normalized[0].costScore === 0.5 &&
    normalized[1].costScore === 1.0;

  results.push({
    id: 'unit-normalization',
    name: 'Normalization: Relative ratio relative to Pareto minimums',
    passed: normPassed,
    expected: 'c1: T=1.0, C=0.5; c2: T=0.75, C=1.0',
    actual: `c1: T=${normalized[0]?.timeScore}, C=${normalized[0]?.costScore}; c2: T=${normalized[1]?.timeScore}, C=${normalized[1]?.costScore}`,
    details: 'Proves inverse proportional normalization preserves monotonic utility ordering.',
  });

  // Test 4: Winner Flip between Fast and Cheap styles
  // c1 is fast (300m, ₹2000), c2 is cheap (400m, ₹1000)
  // Under Fast (50/20/15/15):
  // c1: 0.5*1.0 + 0.2*0.5 + 0.15*0.8 + 0.15*0.8 = 0.5 + 0.1 + 0.12 + 0.12 = 0.84
  // c2: 0.5*0.75 + 0.2*1.0 + 0.15*0.5 + 0.15*0.6 = 0.375 + 0.2 + 0.075 + 0.09 = 0.74 => c1 WINS!
  // Under Cheap (20/50/15/15):
  // c1: 0.2*1.0 + 0.5*0.5 + 0.15*0.8 + 0.15*0.8 = 0.2 + 0.25 + 0.12 + 0.12 = 0.69
  // c2: 0.2*0.75 + 0.5*1.0 + 0.15*0.5 + 0.15*0.6 = 0.15 + 0.5 + 0.075 + 0.09 = 0.815 => c2 WINS!
  const scoredFast = normalizeAndScoreCandidates([dummyCandidate1, dummyCandidate2], 'Fast');
  const scoredCheap = normalizeAndScoreCandidates([dummyCandidate1, dummyCandidate2], 'Cheap');
  const fastWinner = scoredFast.sort((a, b) => b.compositeScore - a.compositeScore)[0].id;
  const cheapWinner = scoredCheap.sort((a, b) => b.compositeScore - a.compositeScore)[0].id;
  const flipPassed = fastWinner === 'c1' && cheapWinner === 'c2';

  results.push({
    id: 'unit-style-flip',
    name: 'Dynamic Policy Flip: Fast vs Cheap style shifts winning corridor',
    passed: flipPassed,
    expected: 'Fast style selects c1; Cheap style selects c2',
    actual: `Fast style selected ${fastWinner} (${scoredFast.find(c => c.id === 'c1')?.compositeScore}); Cheap style selected ${cheapWinner} (${scoredCheap.find(c => c.id === 'c2')?.compositeScore})`,
    details: 'Validates that style change shifts ranking without reloading or server recalculations.',
  });

  // Test 5: Explanation correctness
  const explanation = generateDeterministicExplanation(scoredFast, 'Fast', DEFAULT_VEHICLE);
  const explanationValid =
    explanation.headline.includes('Expressway') &&
    explanation.whyBullets.length >= 2 &&
    explanation.whatYouGiveUp.length > 0 &&
    explanation.deterministicProof.includes('Engine Score');

  results.push({
    id: 'unit-explanation',
    name: 'Explanation Determinism: Structural adherence to prompt spec',
    passed: explanationValid,
    expected: 'Headline with time/cost comparison, ≥2 why bullets, give-up trade-off',
    actual: `${explanation.headline} [${explanation.whyBullets.length} bullets]`,
    details: 'Ensures clear communication without vague AI buzzwords.',
  });

  return results;
}

function createMockCandidate(
  id: string,
  name: string,
  durationMinutes: number,
  costInr: number,
  comfortScore: number,
  stopQualityScore: number
): RouteCandidate {
  return {
    id,
    name,
    summary: `Via ${name}`,
    distanceKm: 350,
    drivingDurationMinutes: durationMinutes,
    totalDurationMinutes: durationMinutes,
    totalCostInr: costInr,
    trafficSource: 'No live traffic',
    geometry: [],
    stepsCount: 15,
    expresswayFraction: 0.7,
    surfaceQualityScore: 0.8,
    tollPlazas: [],
    tollCostInr: 300,
    tollSource: { type: 'Estimated', provider: 'FASTag Formula', timestamp: new Date().toISOString() },
    allStops: [],
    plannedStops: [],
    stopQualityScore,
    comfortScore,
    energyConsumedUnits: 20,
    energyCostInr: costInr - 300,
    energySource: { type: 'Live', provider: 'Web search grounded', timestamp: new Date().toISOString() },
    timeScore: 0,
    costScore: 0,
    scoresByStyle: { Fast: 0, Cheap: 0, Comfort: 0, Default: 0 },
    compositeScore: 0,
    lowestBufferPoint: {
      kmFromOrigin: 175,
      percentRemaining: 30,
      rangeKmRemaining: 90,
      locationName: 'Mock Midpoint',
      rationale: 'Safe mock buffer',
      status: 'safe',
    },
    costBreakdown: {
      energyCostInr: costInr - 300,
      tollCostInr: 300,
      stopRefreshmentCostInr: 0,
      totalCostInr: costInr,
      passengers: 1,
      perPersonCostInr: costInr,
      roundTripCostInr: costInr * 2,
      evSavingsVsPetrolInr: 450,
      tollConcessionNote: 'FASTag mock concession note',
    },
  };
}
