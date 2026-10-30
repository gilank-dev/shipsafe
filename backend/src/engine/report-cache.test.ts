import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TtlLruCache } from './report-cache';
import type { AuditReport } from '../types';

describe('TtlLruCache Implementation', () => {
  let cache: TtlLruCache<string, any>;

  beforeEach(() => {
    cache = new TtlLruCache<string, any>({
      maxSize: 3,
      ttlMs: 1000, // 1 second for test
      cleanupIntervalMs: 0, // disable automatic timer in unit tests
    });
  });

  it('stores and retrieves items correctly', () => {
    cache.set('key1', { data: 'test1' });
    expect(cache.get('key1')).toEqual({ data: 'test1' });
    expect(cache.has('key1')).toBe(true);
    expect(cache.size).toBe(1);
  });

  it('enforces maxSize LRU eviction when capacity is exceeded', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.size).toBe(3);

    // Adding 4th item should evict 'a' (oldest)
    cache.set('d', 4);
    expect(cache.size).toBe(3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('refreshes LRU order upon access via get()', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Access 'a' to make it most recently used
    expect(cache.get('a')).toBe(1);

    // Now adding 'd' should evict 'b' (not 'a')
    cache.set('d', 4);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('evicts expired items based on TTL', async () => {
    vi.useFakeTimers();
    try {
      cache.set('item', 'value', 500); // 500ms TTL
      expect(cache.get('item')).toBe('value');

      // Advance time by 600ms
      vi.advanceTimersByTime(600);

      // Should be expired and return undefined
      expect(cache.get('item')).toBeUndefined();
      expect(cache.has('item')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('prunes expired entries with pruneExpired()', () => {
    vi.useFakeTimers();
    try {
      cache.set('a', 1, 100);
      cache.set('b', 2, 500);

      vi.advanceTimersByTime(200);

      const pruned = cache.pruneExpired();
      expect(pruned).toBe(1);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('deletes and clears correctly', () => {
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.delete('a')).toBe(true);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(1);

    cache.clear();
    expect(cache.size).toBe(0);
  });
});
