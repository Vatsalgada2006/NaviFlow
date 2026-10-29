/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChoiceLogEntry, PersonalizedWeights, RouteCandidate, JourneyStyle } from '../types';
import { SCORING_WEIGHTS, StyleWeights } from './scoring';

export const CHOICE_LOGS_STORAGE_KEY = 'naviflow_choice_logs_v1';
export const PERSONALIZATION_ENABLED_KEY = 'naviflow_personalization_enabled_v1';

/**
 * Log a user choice decision anonymously to localStorage.
 * Action: saving a journey, opening Google Maps, or sharing counts as a preference signal.
 */
export function recordUserDecision(
  chosen: RouteCandidate,
  allCandidates: RouteCandidate[],
  action: 'save' | 'open_maps' | 'share'
): void {
  if (typeof window === 'undefined') return;

  try {
    const isEnabled = localStorage.getItem(PERSONALIZATION_ENABLED_KEY) !== 'false';
    if (!isEnabled) return;

    const others = allCandidates
      .filter((c) => c.id !== chosen.id)
      .map((c) => ({
        timeScore: c.timeScore || 0.5,
        costScore: c.costScore || 0.5,
        comfortScore: c.comfortScore || 0.5,
        stopScore: c.stopQualityScore || 0.5,
      }));

    if (others.length === 0) return;

    const entry: ChoiceLogEntry = {
      id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      routeId: chosen.id,
      action,
      features: {
        timeScore: chosen.timeScore || 0.5,
        costScore: chosen.costScore || 0.5,
        comfortScore: chosen.comfortScore || 0.5,
        stopScore: chosen.stopQualityScore || 0.5,
      },
      otherCandidatesFeatures: others,
    };

    const existingRaw = localStorage.getItem(CHOICE_LOGS_STORAGE_KEY);
    const list: ChoiceLogEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
    list.unshift(entry);
    // Keep up to 100 historical decisions
    if (list.length > 100) list.pop();
    localStorage.setItem(CHOICE_LOGS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to record user decision:', err);
  }
}

/**
 * Retrieve logged user decisions.
 */
export function getLoggedDecisions(): ChoiceLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHOICE_LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear all logged decisions.
 */
export function clearLoggedDecisions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CHOICE_LOGS_STORAGE_KEY);
}

/**
 * Fits a pairwise logistic regression (Bradley-Terry) model on historical decisions.
 * Returns weights: (time, cost, comfort, stop).
 */
export function fitBradleyTerryWeights(logs: ChoiceLogEntry[]): StyleWeights {
  if (!logs || logs.length === 0) {
    return { ...SCORING_WEIGHTS.Default };
  }

  // Parameter vector w = [w_time, w_cost, w_comfort, w_stop]
  // Initialize with uniform weights
  let w = [0.25, 0.25, 0.25, 0.25];
  const lr = 0.15;
  const lambda = 0.01; // L2 regularization
  const iterations = 40;

  const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));

  for (let it = 0; it < iterations; it++) {
    const grad = [0, 0, 0, 0];

    for (const log of logs) {
      const chosenFeat = [
        log.features.timeScore,
        log.features.costScore,
        log.features.comfortScore,
        log.features.stopScore,
      ];

      for (const other of log.otherCandidatesFeatures) {
        const otherFeat = [
          other.timeScore,
          other.costScore,
          other.comfortScore,
          other.stopScore,
        ];

        // Delta feature
        const delta = [
          chosenFeat[0] - otherFeat[0],
          chosenFeat[1] - otherFeat[1],
          chosenFeat[2] - otherFeat[2],
          chosenFeat[3] - otherFeat[3],
        ];

        const dot = w[0] * delta[0] + w[1] * delta[1] + w[2] * delta[2] + w[3] * delta[3];
        const prob = sigmoid(dot);
        const error = 1.0 - prob;

        grad[0] += error * delta[0];
        grad[1] += error * delta[1];
        grad[2] += error * delta[2];
        grad[3] += error * delta[3];
      }
    }

    // Gradient ascent step with weight decay
    for (let k = 0; k < 4; k++) {
      w[k] = w[k] + lr * (grad[k] / Math.max(1, logs.length) - lambda * w[k]);
    }
  }

  // Softmax / positive projection
  const expW = w.map((v) => Math.exp(Math.max(-5, Math.min(5, v))));
  const sumExp = expW.reduce((a, b) => a + b, 0);
  const normalized = expW.map((v) => v / sumExp);

  return {
    time: normalized[0],
    cost: normalized[1],
    comfort: normalized[2],
    stop: normalized[3],
  };
}

/**
 * Blend learned weights with current active journey style.
 * Formula: final = 0.7 * style + 0.3 * learned, bounded between 0.05 and 0.60, normalized to 1.
 */
export function getBlendedPersonalizedWeights(
  style: JourneyStyle | 'Default',
  logs: ChoiceLogEntry[] = getLoggedDecisions()
): PersonalizedWeights {
  const baseStyleWeights = SCORING_WEIGHTS[style] || SCORING_WEIGHTS.Default;

  if (logs.length < 10) {
    return {
      time: baseStyleWeights.time,
      cost: baseStyleWeights.cost,
      comfort: baseStyleWeights.comfort,
      stop: baseStyleWeights.stop,
      isPersonalized: false,
      sampleCount: logs.length,
      explanation: 'Using standard transparent weights. Personalization activates after 10 route choices.',
    };
  }

  const learned = fitBradleyTerryWeights(logs);

  // 0.7 * style + 0.3 * learned
  let rawTime = 0.7 * baseStyleWeights.time + 0.3 * learned.time;
  let rawCost = 0.7 * baseStyleWeights.cost + 0.3 * learned.cost;
  let rawComfort = 0.7 * baseStyleWeights.comfort + 0.3 * learned.comfort;
  let rawStop = 0.7 * baseStyleWeights.stop + 0.3 * learned.stop;

  // Clamp between 0.05 and 0.60
  const clamp = (v: number) => Math.min(0.6, Math.max(0.05, v));
  let cTime = clamp(rawTime);
  let cCost = clamp(rawCost);
  let cComfort = clamp(rawComfort);
  let cStop = clamp(rawStop);

  // Renormalize to sum to 1.0
  const sum = cTime + cCost + cComfort + cStop;
  const time = Number((cTime / sum).toFixed(4));
  const cost = Number((cCost / sum).toFixed(4));
  const comfort = Number((cComfort / sum).toFixed(4));
  const stop = Number((1.0 - time - cost - comfort).toFixed(4));

  // Human-readable explanation
  let explanation = 'Personalised from your past choices: ';
  if (cost > baseStyleWeights.cost + 0.03) {
    explanation += 'You usually choose cheaper routes, so cost counts a little more.';
  } else if (time > baseStyleWeights.time + 0.03) {
    explanation += 'You tend to prioritize faster routes and bypass delays.';
  } else if (comfort > baseStyleWeights.comfort + 0.03) {
    explanation += 'You tend to prefer smoother highways and better road surfaces.';
  } else {
    explanation += 'Weights gently calibrated to your recent route preferences.';
  }

  return {
    time,
    cost,
    comfort,
    stop,
    isPersonalized: true,
    sampleCount: logs.length,
    explanation,
  };
}

/**
 * Replay historical choices to compare accuracy: Standard vs Personalised.
 */
export function replayChoicesAccuracy(logs: ChoiceLogEntry[]): {
  sampleSize: number;
  standardMatches: number;
  personalizedMatches: number;
  standardAccuracyPercent: number;
  personalizedAccuracyPercent: number;
  isReady: boolean;
} {
  if (logs.length < 10) {
    return {
      sampleSize: logs.length,
      standardMatches: 0,
      personalizedMatches: 0,
      standardAccuracyPercent: 0,
      personalizedAccuracyPercent: 0,
      isReady: false,
    };
  }

  const learnedWeights = fitBradleyTerryWeights(logs);
  const standardWeights = SCORING_WEIGHTS.Default;

  let standardMatches = 0;
  let personalizedMatches = 0;

  for (const log of logs) {
    const scoreItem = (feat: { timeScore: number; costScore: number; comfortScore: number; stopScore: number }, w: StyleWeights) =>
      w.time * feat.timeScore + w.cost * feat.costScore + w.comfort * feat.comfortScore + w.stop * feat.stopScore;

    const chosenStdScore = scoreItem(log.features, standardWeights);
    const chosenPersScore = scoreItem(log.features, learnedWeights);

    let stdWins = true;
    let persWins = true;

    for (const other of log.otherCandidatesFeatures) {
      if (scoreItem(other, standardWeights) > chosenStdScore) {
        stdWins = false;
      }
      if (scoreItem(other, learnedWeights) > chosenPersScore) {
        persWins = false;
      }
    }

    if (stdWins) standardMatches++;
    if (persWins) personalizedMatches++;
  }

  return {
    sampleSize: logs.length,
    standardMatches,
    personalizedMatches,
    standardAccuracyPercent: Math.round((standardMatches / logs.length) * 100),
    personalizedAccuracyPercent: Math.round((personalizedMatches / logs.length) * 100),
    isReady: true,
  };
}
