import type {
    ItemEnvelope,
    ListOptions,
    QueryableCachedTypeStore,
    QueryParams,
    SortSpec,
} from './types';

export interface InMemoryTypeStoreOptions<
    T,
    TKey = string,
    TCreate = T,
    TUpdate = Partial<T>,
    TQuery extends QueryParams = QueryParams,
> {
    /** Returns the stored key for one value. */
    keyOf(value: T): string;
    /** Converts external keys to the internal string key form. */
    keyToString?(key: TKey): string;
    /** Seeds the store with initial values. */
    initialValues?: Iterable<T>;
    /** Optional default TTL used when registered in CachedObjectStore. */
    ttl_ms?: number;
    /** Optional cache predicate used by CachedObjectStore. */
    canCache?(value: T): boolean;
    /** Optional custom create implementation. */
    create?(input: TCreate, store: InMemoryTypeStore<T, TKey, TCreate, TUpdate, TQuery>): T;
    /** Optional custom update implementation. */
    update?(existing: T, input: TUpdate, store: InMemoryTypeStore<T, TKey, TCreate, TUpdate, TQuery>): T;
    /** Optional custom query matcher. */
    matchesQuery?(value: T, query: TQuery): boolean;
    /** Optional field accessor used for built-in sorting and query filtering. */
    fieldValue?(value: T, field: string): unknown;
}

/**
 * Provides a reusable in-memory TypeStore for tests, demos, and local adapters.
 */
export class InMemoryTypeStore<
    T,
    TKey = string,
    TCreate = T,
    TUpdate = Partial<T>,
    TQuery extends QueryParams = QueryParams,
> implements QueryableCachedTypeStore<T, TKey, TCreate, TUpdate, TQuery> {

    public readonly records = new Map<string, T>();
    public readonly ttl_ms?: number;

    constructor(private readonly options: InMemoryTypeStoreOptions<T, TKey, TCreate, TUpdate, TQuery>) {
        this.ttl_ms = options.ttl_ms;

        if (options.initialValues) {
            for (const value of options.initialValues) {
                this.records.set(this.keyOf(value), value);
            }
        }
    }

    public keyOf(value: T): string {
        return this.options.keyOf(value);
    }

    public canCache(value: T): boolean {
        return this.options.canCache ? this.options.canCache(value) : true;
    }

    public async fetch(key: TKey): Promise<T | undefined> {
        return this.records.get(this.keyToString(key));
    }

    public async list(options?: ListOptions): Promise<ItemEnvelope<T>> {
        const items = this.paginate(this.sortItems(Array.from(this.records.values()), options?.sort), options);

        return {
            items,
            meta: {
                page: options?.page ?? 1,
                pageSize: options?.pageSize ?? this.records.size,
                total: this.records.size,
            },
        };
    }

    public async query(query: TQuery): Promise<ItemEnvelope<T>> {
        const filtered = Array.from(this.records.values()).filter(value => this.matchesQuery(value, query));
        const items = this.paginate(this.sortItems(filtered, query.sort), query);

        return {
            items,
            meta: {
                page: query.page ?? 1,
                pageSize: query.pageSize ?? filtered.length,
                total: filtered.length,
            },
        };
    }

    public async create(input: TCreate): Promise<T> {
        const value = this.options.create ? this.options.create(input, this) : input as unknown as T;
        this.records.set(this.keyOf(value), value);
        return value;
    }

    public async update(existing: T, input: TUpdate): Promise<T> {
        const value = this.options.update ? this.options.update(existing, input, this) : this.mergeValue(existing, input);
        this.records.set(this.keyOf(value), value);
        return value;
    }

    public async delete(key: TKey): Promise<boolean> {
        return this.records.delete(this.keyToString(key));
    }

    private keyToString(key: TKey): string {
        return this.options.keyToString ? this.options.keyToString(key) : String(key);
    }

    private matchesQuery(value: T, query: TQuery): boolean {
        if (this.options.matchesQuery) {
            return this.options.matchesQuery(value, query);
        }

        const { page: _page, pageSize: _pageSize, sort: _sort, ...filters } = query as QueryParams;
        void _page;
        void _pageSize;
        void _sort;

        for (const [field, expected] of Object.entries(filters)) {
            if (expected === undefined) {
                continue;
            }

            if (this.fieldValue(value, field) !== expected) {
                return false;
            }
        }

        return true;
    }

    private fieldValue(value: T, field: string): unknown {
        if (this.options.fieldValue) {
            return this.options.fieldValue(value, field);
        }

        if (typeof value !== 'object' || value === null) {
            return undefined;
        }

        return (value as Record<string, unknown>)[field];
    }

    private sortItems(items: T[], sort?: SortSpec | SortSpec[]): T[] {
        if (!sort) {
            return items;
        }

        const specs = Array.isArray(sort) ? sort : [sort];
        return [...items].sort((left, right) => {
            for (const spec of specs) {
                const result = this.compareValues(this.fieldValue(left, spec.by), this.fieldValue(right, spec.by));
                if (result !== 0) {
                    return spec.direction === 'desc' ? -result : result;
                }
            }

            return 0;
        });
    }

    private paginate(items: T[], options?: ListOptions): T[] {
        const page = Math.max(options?.page ?? 1, 1);
        const pageSize = Math.max(options?.pageSize ?? (items.length || 1), 1);
        const offset = (page - 1) * pageSize;
        return items.slice(offset, offset + pageSize);
    }

    private compareValues(left: unknown, right: unknown): number {
        if (left === right) {
            return 0;
        }

        if (left === undefined || left === null) {
            return 1;
        }

        if (right === undefined || right === null) {
            return -1;
        }

        if (left > right) {
            return 1;
        }

        if (left < right) {
            return -1;
        }

        return 0;
    }

    private mergeValue(existing: T, input: TUpdate): T {
        if (typeof existing === 'object' && existing !== null && typeof input === 'object' && input !== null) {
            return Object.assign(Object.create(Object.getPrototypeOf(existing)), existing, input) as T;
        }

        return input as unknown as T;
    }
}