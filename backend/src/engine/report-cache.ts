import type { AuditReport } from '../types';

export interface CacheOptions {
  /** Maximum number of entries before LRU eviction triggers (default: 50) */
  maxSize?: number;
  /** Time-to-live per entry in milliseconds (default: 30 minutes) */
  ttlMs?: number;
  /** Periodic cleanup interval in milliseconds (default: 5 minutes, 0 to disable) */
  cleanupIntervalMs?: number;
}

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

/**
 * High-performance, memory-bounded LRU Cache with TTL expiration.
 * Prevents memory leaks in long-running Node.js processes on VPS servers.
 */
export class TtlLruCache<K, V> {
  private map = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.maxSize = Math.max(1, options.maxSize ?? 50);
    this.ttlMs = Math.max(1000, options.ttlMs ?? 30 * 60 * 1000); // 30 min default

    const interval = options.cleanupIntervalMs ?? 5 * 60 * 1000;
    if (interval > 0 && typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.pruneExpired(), interval);
      if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
        this.cleanupTimer.unref(); // Avoid holding Node process open
      }
    }
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }

    // Refresh LRU recency: re-insert at end of Map
    this.map.delete(key);
    this.map.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V, customTtlMs?: number): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict least recently used (first key in iteration order)
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }

    const ttl = customTtlMs ?? this.ttlMs;
    this.map.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  /**
   * Prune all expired entries from cache.
   * Returns the count of removed expired keys.
   */
  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.map.entries()) {
      if (now > entry.expiresAt) {
        this.map.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  keys(): IterableIterator<K> {
    return this.map.keys();
  }

  values(): IterableIterator<V> {
    const values: V[] = [];
    const now = Date.now();
    for (const [key, entry] of this.map.entries()) {
      if (now <= entry.expiresAt) {
        values.push(entry.value);
      }
    }
    return values[Symbol.iterator]();
  }

  get size(): number {
    return this.map.size;
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.map.clear();
  }
}

/**
 * Singleton Report Cache instance with 50-item cap and 30-minute TTL.
 */
export const reportCache = new TtlLruCache<string, AuditReport>({
  maxSize: 50,
  ttlMs: 30 * 60 * 1000, // 30 minutes
  cleanupIntervalMs: 5 * 60 * 1000, // Prune every 5 minutes
});
