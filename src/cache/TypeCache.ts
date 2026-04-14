
import type { CachePredicate } from './types';

type TimeoutHandle = ReturnType<typeof setTimeout>;

/**
 * Stores values by string key with optional per-entry or default TTL support.
 */
export class TypeCache<T> {

    private default_ttl_ms?: number;

    private cache: Map<string, T> = new Map<string, T>();

    private lifetimes: Map<string, TimeoutHandle> = new Map<string, TimeoutHandle>();

    /**
     * Creates a cache with an optional default TTL applied to entries that do not provide one.
     */
    constructor(default_ttl_ms?: number) {
        this.default_ttl_ms = default_ttl_ms;
    }

    /**
     * Returns whether the cache currently contains a value for the given key.
     */
    public has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Returns the number of cached entries.
     */
    public size(): number {
        return this.cache.size;
    }

    /**
     * Lists all cached keys.
     */
    public keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Lists all cached values.
     */
    public values(): T[] {
        return Array.from(this.cache.values());
    }

    /**
     * Lists all cached key-value pairs.
     */
    public entries(): Array<[string, T]> {
        return Array.from(this.cache.entries());
    }

    /**
     * Returns the default TTL applied to entries when no per-entry TTL is provided.
     */
    public getDefaultTTL(): number | undefined {
        return this.default_ttl_ms;
    }

    /**
     * Updates the default TTL for future writes.
     */
    public setDefaultTTL(default_ttl_ms?: number): void {
        this.default_ttl_ms = default_ttl_ms;
    }

    /**
     * Stores a value by key and applies the provided TTL or the cache default TTL when available.
     */
    public set(key: string, value: T, ttl_ms?: number): void {
        this.cache.set(key, value);

        const effective_ttl_ms = ttl_ms ?? this.default_ttl_ms;
        if (effective_ttl_ms !== undefined) {
            this.setTTL(key, effective_ttl_ms);
        } else {
            this.clearTTL(key);
        }
    }

    /**
     * Applies or replaces the TTL for one cached entry.
     */
    public setTTL(key: string, ttl_ms: number): void {
        if (this.cache.has(key)) {
            this.clearTTL(key);

            const timeout = setTimeout(() => this.delete(key), ttl_ms);
            this.lifetimes.set(key, timeout);
        }
    }

    /**
     * Applies the same TTL to every entry matched by the predicate.
     */
    public setTTLWhere(ttl_ms: number, predicate: CachePredicate<T>): number {
        let count = 0;

        for (const [key, value] of this.cache.entries()) {
            if (!predicate(key, value)) {
                continue;
            }

            this.setTTL(key, ttl_ms);
            count += 1;
        }

        return count;
    }

    /**
     * Reads a cached value by key.
     */
    public get(key: string): T | undefined {
        return this.cache.get(key);
    }

    /**
     * Removes one cached entry and clears its scheduled TTL if present.
     */
    public delete(key: string): boolean {
        const existed = this.cache.delete(key);
        this.clearTTL(key);
        return existed;
    }

    /**
     * Removes every entry matched by the predicate.
     */
    public deleteWhere(predicate: CachePredicate<T>): number {
        let count = 0;

        for (const [key, value] of this.cache.entries()) {
            if (!predicate(key, value)) {
                continue;
            }

            this.delete(key);
            count += 1;
        }

        return count;
    }

    /**
     * Empties the cache and clears all scheduled TTL timers.
     */
    public clear(): void {
        this.cache.clear();
        this.lifetimes.forEach((lifetime) => clearTimeout(lifetime));
        this.lifetimes.clear();
    }

    private clearTTL(key: string): void {
        const lifetime = this.lifetimes.get(key);
        if (!lifetime) {
            return;
        }

        clearTimeout(lifetime);
        this.lifetimes.delete(key);
    }
}