/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const NAVIFLOW_USER_AGENT = 'Mozilla/5.0 (compatible; NaviFlow/1.0; +https://naviflow.in)';

// Queue for sequential rate-limited requests (e.g. Nominatim 1 req/sec)
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private minIntervalMs: number;
  private lastRequestTime = 0;

  constructor(minIntervalMs = 1100) {
    this.minIntervalMs = minIntervalMs;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      if (elapsed < this.minIntervalMs) {
        await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
      }
      this.lastRequestTime = Date.now();
      const nextFn = this.queue.shift();
      if (nextFn) {
        try {
          await nextFn();
        } catch (e) {
          // handled in promise wrapper
        }
      }
    }

    this.isProcessing = false;
  }
}

export const nominatimQueue = new RequestQueue(1200);

export async function fetchWithTimeoutAndRetry(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12000,
  maxRetries = 2
): Promise<Response> {
  let attempt = 0;
  let lastError: any = null;

  const headers = {
    'User-Agent': NAVIFLOW_USER_AGENT,
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        // Rate limited: backoff
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : (attempt + 1) * 1500;
        await new Promise((r) => setTimeout(r, waitTime));
        attempt++;
        continue;
      }

      if (!response.ok && attempt < maxRetries && response.status >= 500) {
        // Server error retry
        attempt++;
        await new Promise((r) => setTimeout(r, attempt * 800));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
      }
      attempt++;
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 800));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}
