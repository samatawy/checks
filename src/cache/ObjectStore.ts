import type { ItemEnvelope, ListOptions, QueryParams, QueryableTypeStore, StoreType, TypeStore } from './types';

/**
 * Groups per-type CRUD stores behind one registry.
 */
export class ObjectStore {

    /**
     * Shared process-wide store registry.
     */
    public static readonly global = new ObjectStore();

    private readonly stores = new Map<StoreType<any>, TypeStore<any, any, any, any>>();

    /**
     * Returns the number of registered type stores.
     */
    public size(): number {
        return this.stores.size;
    }

    /**
     * Returns whether a store has been registered for the given type.
     */
    public hasTypeStore<T>(type: StoreType<T>): boolean {
        return this.stores.has(type);
    }

    /**
     * Registers or replaces the store for one runtime type.
     */
    public registerTypeStore<T, TKey = string, TCreate = any, TUpdate = any>(
        type: StoreType<T>,
        store: TypeStore<T, TKey, TCreate, TUpdate>,
    ): this {
        this.stores.set(type, store);
        return this;
    }

    /**
     * Returns the registered store for one runtime type.
     */
    public getTypeStore<T, TKey = string, TCreate = any, TUpdate = any>(
        type: StoreType<T>,
    ): TypeStore<T, TKey, TCreate, TUpdate> {
        const store = this.stores.get(type);
        if (!store) {
            throw new Error(`No type store is registered for ${type.name || 'anonymous type'}.`);
        }

        return store as TypeStore<T, TKey, TCreate, TUpdate>;
    }

    /**
     * Removes the store for one runtime type.
     */
    public deleteTypeStore<T>(type: StoreType<T>): boolean {
        return this.stores.delete(type);
    }

    /**
     * Clears all registered type stores.
     */
    public clear(): void {
        this.stores.clear();
    }

    /**
     * Fetches one typed value by key.
     */
    public async fetch<T, TKey = string>(type: StoreType<T>, key: TKey): Promise<T | undefined> {
        return await this.getTypeStore<T, TKey>(type).fetch(key);
    }

    /**
     * Lists values for one type and returns them in an envelope with `items` and optional `meta`.
     */
    public async list<T>(type: StoreType<T>, options?: ListOptions): Promise<ItemEnvelope<T>> {
        return await this.getTypeStore<T>(type).list(options);
    }

    /**
     * Queries values for one type through a query-capable store and returns them in the same envelope shape.
     */
    public async query<T, TQuery extends QueryParams = QueryParams>(
        type: StoreType<T>,
        query: TQuery,
    ): Promise<ItemEnvelope<T>> {
        return await this.getQueryableTypeStore<T, string, any, any, TQuery>(type).query(query);
    }

    /**
     * Creates one typed value through the registered store.
     */
    public async create<T, TCreate = any>(type: StoreType<T>, input: TCreate): Promise<T> {
        return await this.getTypeStore<T, string, TCreate>(type).create(input);
    }

    /**
     * Updates one typed value through the registered store.
     */
    public async update<T, TUpdate = any>(type: StoreType<T>, existing: T, input: TUpdate): Promise<T> {
        return await this.getTypeStore<T, string, any, TUpdate>(type).update(existing, input);
    }

    /**
     * Deletes one typed value by key through the registered store.
     */
    public async delete<T, TKey = string>(type: StoreType<T>, key: TKey): Promise<boolean | void> {
        return await this.getTypeStore<T, TKey>(type).delete(key);
    }

    private getQueryableTypeStore<
        T,
        TKey = string,
        TCreate = any,
        TUpdate = any,
        TQuery extends QueryParams = QueryParams,
    >(type: StoreType<T>): QueryableTypeStore<T, TKey, TCreate, TUpdate, TQuery> {
        const store = this.getTypeStore<T, TKey, TCreate, TUpdate>(type) as Partial<QueryableTypeStore<T, TKey, TCreate, TUpdate, TQuery>>;
        if (typeof store.query !== 'function') {
            throw new Error(`The store registered for ${type.name || 'anonymous type'} does not support query(...).`);
        }

        return store as QueryableTypeStore<T, TKey, TCreate, TUpdate, TQuery>;
    }
}