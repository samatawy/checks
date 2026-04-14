/**
 * Represents a runtime constructor used to group cached or stored values by type.
 */
export type RuntimeType<T> = abstract new (...args: any[]) => T;

/**
 * Represents a runtime type whose values are stored in a dedicated TypeCache.
 */
export type CacheType<T> = RuntimeType<T>;

/**
 * Represents a runtime type whose values are handled by a dedicated TypeStore.
 */
export type StoreType<T> = RuntimeType<T>;

/**
 * Allows store implementations to be synchronous or asynchronous.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Matches cache entries by key and value for bulk operations.
 */
export type CachePredicate<T> = (key: string, value: T) => boolean;

/**
 * Allowed sort directions for list and query operations.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Describes one sort field and direction.
 */
export interface SortSpec {
    /** Field name understood by the store implementation. */
    by: string;
    /** Optional sort direction. */
    direction?: SortDirection;
}

/**
 * Common options for list-style operations.
 */
export interface ListOptions {
    /** Optional 1-based page number. */
    page?: number;
    /** Optional page size. */
    pageSize?: number;
    /** Optional sort specification. */
    sort?: SortSpec | SortSpec[];
}

/**
 * Generic query parameters for stores that support richer filtering.
 */
export type QueryParams = Record<string, unknown> & ListOptions;

/**
 * Controls wrapper behavior for query execution.
 */
export interface QueryExecutionOptions {
    /** When false, the cached wrapper will not cache returned items. */
    cache?: boolean;
}

/**
 * Wraps returned items with optional metadata or raw provider responses.
 */
export interface ItemEnvelope<T> {
    /** Returned items that may be cached by higher-level wrappers. */
    items: T[];
    /** Optional paging, cursor, or total-count metadata. */
    meta?: unknown;
    /** Optional untouched provider response. */
    raw?: unknown;
}

/**
 * Defines CRUD-style access for one runtime type.
 */
export interface TypeStore<T, TKey = string, TCreate = any, TUpdate = any> {
    /** Returns the cache/store key for one value. */
    keyOf(value: T): string;
    /** Returns whether one value should be written into the cache. */
    canCache?(value: T): boolean;
    /** Fetches one value by key. */
    fetch(key: TKey): MaybePromise<T | undefined>;
    /** Lists values for the type with optional paging and sorting. */
    list(options?: ListOptions): MaybePromise<ItemEnvelope<T>>;
    /** Creates a new value from the provided input. */
    create(input: TCreate): MaybePromise<T>;
    /** Updates an existing value from the provided input. */
    update(existing: T, input: TUpdate): MaybePromise<T>;
    /** Deletes one value by key. */
    delete(key: TKey): MaybePromise<boolean | void>;
}

/**
 * Adds richer query support to a TypeStore.
 */
export interface QueryableTypeStore<T, TKey = string, TCreate = any, TUpdate = any, TQuery extends QueryParams = QueryParams>
    extends TypeStore<T, TKey, TCreate, TUpdate> {
    /** Queries values for the type using store-specific filters. */
    query(query: TQuery): MaybePromise<ItemEnvelope<T>>;
}

/**
 * Extends a type store with cache-specific configuration.
 */
export interface CachedTypeStore<T, TKey = string, TCreate = any, TUpdate = any>
    extends TypeStore<T, TKey, TCreate, TUpdate> {
    /** Optional default TTL applied to cached values for this type. */
    ttl_ms?: number;
}

/**
 * Convenience alias for cached stores that also support richer query filters.
 */
export type QueryableCachedTypeStore<
    T,
    TKey = string,
    TCreate = any,
    TUpdate = any,
    TQuery extends QueryParams = QueryParams,
> = CachedTypeStore<T, TKey, TCreate, TUpdate> & QueryableTypeStore<T, TKey, TCreate, TUpdate, TQuery>;