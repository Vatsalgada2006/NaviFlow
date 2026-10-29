/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleLRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxItems: number;

  constructor(maxItems = 500) {
    this.maxItems = maxItems;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.cache.size >= this.maxItems) {
      // Remove oldest
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const routeCache = new SimpleLRUCache<any>(200);
export const geocodeCache = new SimpleLRUCache<any>(500);
export const stopsCache = new SimpleLRUCache<any>(200);
export const fuelCache = new SimpleLRUCache<any>(100);
export const tileCache = new SimpleLRUCache<Buffer>(500);

export const tomtomQuotaState = {
  quotaExceeded: false,
  lastError: null as string | null,
  requestsCount: 0,
};

