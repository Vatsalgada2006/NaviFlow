/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JourneyPlanResult } from '../types';

const DB_NAME = 'naviflow_db';
const DB_VERSION = 1;
const STORE_JOURNEYS = 'saved_journeys';
const STORE_RECENT_PLANS = 'recent_plans';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_JOURNEYS)) {
        db.createObjectStore(STORE_JOURNEYS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RECENT_PLANS)) {
        db.createObjectStore(STORE_RECENT_PLANS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePlanToIndexedDB(plan: JourneyPlanResult): Promise<void> {
  const planId = `${plan.origin.name}_to_${plan.destination.name}_${plan.vehicle.id}_${plan.journeyStyle}`;
  const entry = { ...plan, id: planId, updatedAt: new Date().toISOString() };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECENT_PLANS, 'readwrite');
      const store = tx.objectStore(STORE_RECENT_PLANS);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage
    try {
      localStorage.setItem(`naviflow_cached_plan_${planId}`, JSON.stringify(entry));
    } catch {}
  }
}

export async function getRecentCachedPlans(): Promise<JourneyPlanResult[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECENT_PLANS, 'readonly');
      const store = tx.objectStore(STORE_RECENT_PLANS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Generates an iCalendar (.ics) string for the journey departure
 */
export function generateCalendarIcs(params: {
  originName: string;
  destinationName: string;
  departureTime: string;
  durationMinutes: number;
  routeSummary: string;
}): string {
  const dep = new Date(params.departureTime);
  const arr = new Date(dep.getTime() + params.durationMinutes * 60 * 1000);

  const formatIcsDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const nowStr = formatIcsDate(new Date());
  const startStr = formatIcsDate(dep);
  const endStr = formatIcsDate(arr);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NaviFlow//India Journey Intelligence//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:naviflow-${Date.now()}@naviflow.engine`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:Highway Road Trip: ${params.originName} to ${params.destinationName}`,
    `DESCRIPTION:NaviFlow road trip schedule.\\nDuration: ~${Math.round(params.durationMinutes / 60)}h ${params.durationMinutes % 60}m\\nRoute: ${params.routeSummary}`,
    `LOCATION:${params.originName}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Prepare for highway road trip departure in 30 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
