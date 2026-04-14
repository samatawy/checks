import { TypeCache } from './TypeCache';
import type { CachePredicate, CacheType } from './types';

/**
 * Groups TypeCache instances by runtime type.
 */
export class ObjectCache {

    /**
     * Shared process-wide cache registry.
     */
    public static readonly global = new ObjectCache();

    private readonly caches = new Map<CacheType<any>, TypeCache<any>>();

    /**
     * Returns the number of registered type caches.
     */
    public size(): number {
        return this.caches.size;
    }

    /**
     * Returns whether a cache has been registered for the given type.
     */
    public hasTypeCache<T>(type: CacheType<T>): boolean {
        return this.caches.has(type);
    }

    /**
     * Returns the cache for a type, creating it when needed.
     */
    public getTypeCache<T>(type: CacheType<T>, default_ttl_ms?: number): TypeCache<T> {
        const existing = this.caches.get(type);
        if (existing) {
            const typedCache = existing as TypeCache<T>;
            if (default_ttl_ms !== undefined) {
                typedCache.setDefaultTTL(default_ttl_ms);
            }
            return typedCache;
        }

        const cache = new TypeCache<T>(default_ttl_ms);
        this.caches.set(type, cache);
        return cache;
    }

    /**
     * Updates the default TTL for one type cache, creating that cache when needed.
     */
    public setTypeDefaultTTL<T>(type: CacheType<T>, default_ttl_ms?: number): TypeCache<T> {
        const cache = this.getTypeCache(type);
        cache.setDefaultTTL(default_ttl_ms);
        return cache;
    }

    /**
     * Returns whether a typed cache contains the given key.
     */
    public has<T>(type: CacheType<T>, key: string): boolean {
        const cache = this.caches.get(type) as TypeCache<T> | undefined;
        return cache ? cache.has(key) : false;
    }

    /**
     * Stores a typed value under the given key.
     */
    public set<T>(type: CacheType<T>, key: string, value: T, ttl_ms?: number): void {
        this.getTypeCache(type).set(key, value, ttl_ms);
    }

    /**
     * Applies or replaces the TTL for one typed cache entry.
     */
    public setTTL<T>(type: CacheType<T>, key: string, ttl_ms: number): boolean {
        const cache = this.caches.get(type) as TypeCache<T> | undefined;
        if (!cache || !cache.has(key)) {
            return false;
        }

        cache.setTTL(key, ttl_ms);
        return true;
    }

    /**
     * Applies the same TTL to every typed entry matched by the predicate.
     */
    public setTTLWhere<T>(type: CacheType<T>, ttl_ms: number, predicate: CachePredicate<T>): number {
        const cache = this.caches.get(type) as TypeCache<T> | undefined;
        return cache ? cache.setTTLWhere(ttl_ms, predicate) : 0;
    }

    /**
     * Reads a typed cached value by key.
     */
    public get<T>(type: CacheType<T>, key: string): T | undefined {
        const cache = this.caches.get(type) as TypeCache<T> | undefined;
        return cache?.get(key);
    }

    /**
     * Removes one typed cached value by key.
     */
    public delete<T>(type: CacheType<T>, key: string): boolean {
        const cache = this.caches.get(type) as TypeCache<T> | undefined;
        return cache ? cache.delete(key) : false;
    }

    /**
     * Removes every typed cached value matched by the predicate.
     */
    public deleteWhere<T>(type: CacheType<T>, predicate: CachePredicate<T>): number {
        const cache = this.caches.get(type) as TypeCache<T> | undefined;
        return cache ? cache.deleteWhere(predicate) : 0;
    }

    /**
     * Removes and clears one whole type cache.
     */
    public deleteTypeCache<T>(type: CacheType<T>): boolean {
        const cache = this.caches.get(type);
        if (!cache) {
            return false;
        }

        cache.clear();
        this.caches.delete(type);
        return true;
    }

    /**
     * Clears every registered type cache.
     */
    public clear(): void {
        for (const cache of this.caches.values()) {
            cache.clear();
        }

        this.caches.clear();
    }
}