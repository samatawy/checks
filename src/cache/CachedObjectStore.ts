import { ObjectCache } from './ObjectCache';
import { ObjectStore } from './ObjectStore';
import type {
    CachedTypeStore,
    ItemEnvelope,
    ListOptions,
    QueryExecutionOptions,
    QueryParams,
    QueryableCachedTypeStore,
    QueryableTypeStore,
    StoreType,
} from './types';

export type { CachedTypeStore, QueryableCachedTypeStore } from './types';

/**
 * Wraps ObjectStore with read-through and write-through caching behavior.
 */
export class CachedObjectStore {

    /**
     * Shared process-wide cached store registry.
     */
    public static readonly global = new CachedObjectStore(ObjectStore.global, ObjectCache.global);

    /**
     * Creates a cached store wrapper with explicit store and cache registries.
     */
    constructor(
        public readonly store: ObjectStore = new ObjectStore(),
        public readonly cache: ObjectCache = new ObjectCache(),
    ) { }

    /**
     * Registers a per-type store and applies its default TTL to the cache when provided.
     */
    public registerTypeStore<T, TKey = string, TCreate = any, TUpdate = any>(
        type: StoreType<T>,
        store: CachedTypeStore<T, TKey, TCreate, TUpdate>,
    ): this {
        this.store.registerTypeStore(type, store);

        if (store.ttl_ms !== undefined) {
            this.cache.setTypeDefaultTTL(type, store.ttl_ms);
        }

        return this;
    }

    /**
     * Returns whether a cached store has been registered for the given type.
     */
    public hasTypeStore<T>(type: StoreType<T>): boolean {
        return this.store.hasTypeStore(type);
    }

    /**
     * Returns the registered cached store definition for one type.
     */
    public getTypeStore<T, TKey = string, TCreate = any, TUpdate = any>(
        type: StoreType<T>,
    ): CachedTypeStore<T, TKey, TCreate, TUpdate> {
        return this.store.getTypeStore(type) as CachedTypeStore<T, TKey, TCreate, TUpdate>;
    }

    /**
     * Reads one value from cache first and falls back to the registered store when needed.
     */
    public async fetch<T, TKey extends string = string>(type: StoreType<T>, key: TKey): Promise<T | undefined> {
        const cached = this.cache.get(type, key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await this.store.fetch(type, key);
        if (value !== undefined) {
            this.cacheValue(type, value);
        }

        return value;
    }

    /**
     * Lists values through the store and caches each returned item from `result.items`.
     */
    public async list<T>(type: StoreType<T>, options?: ListOptions): Promise<ItemEnvelope<T>> {
        const result = await this.store.list(type, options);
        this.cacheItems(type, result.items);
        return result;
    }

    /**
     * Queries values through a query-capable store and caches each returned item from `result.items`.
     */
    public async query<T, TQuery extends QueryParams = QueryParams>(
        type: StoreType<T>,
        query: TQuery,
        options?: QueryExecutionOptions,
    ): Promise<ItemEnvelope<T>> {
        const result = await this.store.query(type, query);
        if (options?.cache !== false) {
            this.cacheItems(type, result.items);
        }
        return result;
    }

    /**
     * Creates one value through the store and writes the result into the cache.
     */
    public async create<T, TCreate = any>(type: StoreType<T>, input: TCreate): Promise<T> {
        const value = await this.store.create(type, input);
        this.cacheValue(type, value);
        return value;
    }

    /**
     * Updates one value through the store and writes the updated result into the cache.
     */
    public async update<T, TUpdate = any>(type: StoreType<T>, existing: T, input: TUpdate): Promise<T> {
        const value = await this.store.update(type, existing, input);
        this.cacheValue(type, value);
        return value;
    }

    /**
     * Deletes one value through the store and removes the matching cached entry.
     */
    public async delete<T, TKey extends string = string>(type: StoreType<T>, key: TKey): Promise<boolean | void> {
        const result = await this.store.delete(type, key);
        this.cache.delete(type, key);
        return result;
    }

    /**
     * Reads a typed value from cache only, without touching the backing store.
     */
    public getCached<T>(type: StoreType<T>, key: string): T | undefined {
        return this.cache.get(type, key);
    }

    /**
     * Returns the registered query-capable cached store definition for one type.
     */
    public getQueryableTypeStore<
        T,
        TKey = string,
        TCreate = any,
        TUpdate = any,
        TQuery extends QueryParams = QueryParams,
    >(type: StoreType<T>): QueryableCachedTypeStore<T, TKey, TCreate, TUpdate, TQuery> {
        const store = this.getTypeStore<T, TKey, TCreate, TUpdate>(type) as Partial<QueryableCachedTypeStore<T, TKey, TCreate, TUpdate, TQuery>>;
        if (typeof store.query !== 'function') {
            throw new Error(`The store registered for ${type.name || 'anonymous type'} does not support query(...).`);
        }

        return store as QueryableCachedTypeStore<T, TKey, TCreate, TUpdate, TQuery>;
    }

    private cacheItems<T>(type: StoreType<T>, items: T[]): void {
        for (const value of items) {
            this.cacheValue(type, value);
        }
    }

    private cacheValue<T>(type: StoreType<T>, value: T): void {
        const store = this.getTypeStore(type);
        if (typeof store.canCache === 'function' && !store.canCache(value)) {
            return;
        }

        this.cache.set(type, store.keyOf(value), value, store.ttl_ms);
    }
}