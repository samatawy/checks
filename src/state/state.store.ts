import type {
    StateChange,
    StateChangeReason,
    StateCollectionDefinition,
    StateDefinition,
    StateItemChange,
    StateItemListener,
    StateListener,
} from './types';

interface CollectionSnapshotItem<TItem> {
    item: TItem;
    index: number;
}

const DEFAULT_ARRAY_ITEMS: StateCollectionDefinition<unknown[], unknown, number> = {
    items(value) {
        return value;
    },
    keyOf(_item, index) {
        return index;
    },
};

const DEFAULT_SET_ITEMS: StateCollectionDefinition<Set<unknown>, unknown, unknown> = {
    items(value) {
        return value.values();
    },
    keyOf(item) {
        return item;
    },
};

const DEFAULT_MAP_ITEMS: StateCollectionDefinition<Map<unknown, unknown>, unknown, unknown> = {
    items(value) {
        return value.values();
    },
    keyOf(item) {
        return item;
    },
};

const DEFAULT_INDEX_KEY_OF = (_item: unknown, index: number): number => {
    return index;
};

/**
 * Keeps keyed state values, derived dependencies, and subscriptions in one place.
 *
 * Example:
 * ```ts
 * const store = new StateStore();
 *
 * store.define<number>('count', { initialValue: 1 });
 * store.define<number>('doubleCount', {
 *   dependencies: [{ key: 'count' }],
 *   derive(state) {
 *     return (state.get<number>('count') ?? 0) * 2;
 *   },
 * });
 * ```
 */
export class StateStore {

    private readonly map = new Map<string, unknown>();

    private readonly definitions = new Map<string, StateDefinition<unknown>>();

    private readonly listeners = new Map<string, Set<StateListener<unknown>>>();

    private readonly itemListeners = new Map<string, Set<StateItemListener<unknown, unknown>>>();

    private readonly dependents = new Map<string, Set<string>>();

    /**
     * Registers metadata for one keyed state entry.
     *
     * Use this for initial values, derived values, dependency graphs, and item-level adapters.
     *
     * Example:
     * ```ts
     * state.define<PersonDto[]>('people', {
     *   initialValue: [],
    *   collection: {
     *     keyOf(person) {
     *       return person.id;
     *     },
     *   },
     * });
     * ```
     */
    public define<T>(key: string, definition: StateDefinition<T>): this {
        const previous = this.definitions.get(key);

        if (previous?.dependencies) {
            for (const dependency of previous.dependencies) {
                this.removeDependent(dependency.key, key);
            }
        }

        this.definitions.set(key, definition as StateDefinition<unknown>);

        try {
            if (definition.dependencies) {
                for (const dependency of definition.dependencies) {
                    this.addDependent(dependency.key, key);
                }
            }

            this.assertNoCycles(key);
        }
        catch (error) {
            if (definition.dependencies) {
                for (const dependency of definition.dependencies) {
                    this.removeDependent(dependency.key, key);
                }
            }

            if (previous) {
                this.definitions.set(key, previous);
                if (previous.dependencies) {
                    for (const dependency of previous.dependencies) {
                        this.addDependent(dependency.key, key);
                    }
                }
            }
            else {
                this.definitions.delete(key);
            }

            throw error;
        }

        if (definition.derive) {
            this.recompute(key);
            return this;
        }

        if (definition.initialValue !== undefined && !this.map.has(key)) {
            this.set(key, definition.initialValue);
        }

        return this;
    }

    /**
     * Recomputes one derived state immediately.
     */
    public recompute(key: string, sourceKey?: string): void {
        const definition = this.definitions.get(key);
        if (!definition?.derive) {
            return;
        }

        const nextValue = definition.derive(this);
        this.setState(key, nextValue, 'dependency', sourceKey);
    }

    /**
     * Stores a value under one key and notifies subscribers when it changes.
     */
    public set<T>(key: string, value: T): void {
        this.setState(key, value, 'set');
    }

    /**
     * Returns the current value for one key.
     */
    public get<T>(key: string): T | undefined {
        return this.map.get(key) as T | undefined;
    }

    /**
     * Returns whether the store currently has a value for one key.
     */
    public has(key: string): boolean {
        return this.map.has(key);
    }

    /**
     * Removes one keyed value and notifies subscribers.
     */
    public delete(key: string): void {
        if (!this.map.has(key)) {
            return;
        }

        const previous = this.map.get(key);
        this.map.delete(key);

        this.publishChange({
            key,
            value: undefined,
            previous,
            reason: 'delete',
        });
    }

    /**
     * Removes all keyed values and notifies subscribers for each removed entry.
     */
    public clear(): void {
        for (const key of Array.from(this.map.keys())) {
            const previous = this.map.get(key);
            this.map.delete(key);

            this.publishChange({
                key,
                value: undefined,
                previous,
                reason: 'clear',
            });
        }
    }

    /**
     * Subscribes to changes for one key.
     *
     * Example:
     * ```ts
    * const unsubscribe = store.subscribe<number>('count', change => {
    *   console.log(change.value);
     * });
     * ```
     */
    public subscribe<T>(key: string, listener: StateListener<T>): () => void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }

        this.listeners.get(key)?.add(listener as StateListener<unknown>);

        return () => {
            this.unsubscribe(key, listener);
        };
    }

    /**
     * Subscribes to the next change for one key and then unsubscribes automatically.
     */
    public subscribeOnce<T>(key: string, listener: StateListener<T>): void {
        const wrapper: StateListener<T> = change => {
            listener(change);
            this.unsubscribe(key, wrapper);
        };

        this.subscribe(key, wrapper);
    }

    /**
     * Removes a previously registered keyed subscription.
     */
    public unsubscribe<T>(key: string, listener: StateListener<T>): void {
        const listeners = this.listeners.get(key);
        if (!listeners) {
            return;
        }

        listeners.delete(listener as StateListener<unknown>);
        if (listeners.size === 0) {
            this.listeners.delete(key);
        }
    }

    /**
     * Subscribes to item-level changes for one collection state.
     *
     * Example:
     * ```ts
    * store.subscribeItem<PersonDto, string>('people', change => {
     *   console.log(change.itemKey, change.kind);
     * });
     * ```
     */
    public subscribeItem<TItem, TItemKey = unknown>(key: string, listener: StateItemListener<TItem, TItemKey>): () => void {
        if (!this.itemListeners.has(key)) {
            this.itemListeners.set(key, new Set());
        }

        this.itemListeners.get(key)?.add(listener as StateItemListener<unknown, unknown>);

        return () => {
            this.unsubscribeItem(key, listener);
        };
    }

    /**
     * Subscribes to the next item-level change for one collection state.
     */
    public subscribeItemOnce<TItem, TItemKey = unknown>(key: string, listener: StateItemListener<TItem, TItemKey>): void {
        const wrapper: StateItemListener<TItem, TItemKey> = change => {
            listener(change);
            this.unsubscribeItem(key, wrapper);
        };

        this.subscribeItem(key, wrapper);
    }

    /**
     * Removes a previously registered item-level subscription.
     */
    public unsubscribeItem<TItem, TItemKey = unknown>(key: string, listener: StateItemListener<TItem, TItemKey>): void {
        const listeners = this.itemListeners.get(key);
        if (!listeners) {
            return;
        }

        listeners.delete(listener as StateItemListener<unknown, unknown>);
        if (listeners.size === 0) {
            this.itemListeners.delete(key);
        }
    }

    protected notifyListeners(key: string, change: StateChange<unknown>): void {
        const listeners = this.listeners.get(key);
        if (!listeners) {
            return;
        }

        for (const listener of Array.from(listeners)) {
            listener(change);
        }
    }

    private setState<T>(key: string, value: T | undefined, reason: StateChangeReason, sourceKey?: string): void {
        const previous = this.get<T>(key);
        const definition = this.definitions.get(key) as StateDefinition<T> | undefined;
        const equals = definition?.equals ?? Object.is;

        if (equals(previous, value)) {
            return;
        }

        this.map.set(key, value);

        this.publishChange({
            key,
            value,
            previous,
            reason,
            sourceKey,
        });
    }

    private publishChange(change: StateChange<unknown>): void {
        this.notifyListeners(change.key, change);
        this.notifyItemListeners(change);
        this.propagate(change);
    }

    private propagate(change: StateChange<unknown>): void {
        const dependents = this.dependents.get(change.key);
        if (!dependents) {
            return;
        }

        for (const dependentKey of dependents) {
            const definition = this.definitions.get(dependentKey);
            if (!definition?.derive) {
                continue;
            }

            const dependency = definition.dependencies?.find(entry => entry.key === change.key);
            if (dependency?.predicate && !dependency.predicate(change, this)) {
                continue;
            }

            this.recompute(dependentKey, change.key);
        }
    }

    private notifyItemListeners(change: StateChange<unknown>): void {
        const listeners = this.itemListeners.get(change.key);
        if (!listeners || listeners.size === 0) {
            return;
        }

        const collection = this.resolveCollectionDefinition(change.key, change.value, change.previous);
        if (!collection) {
            return;
        }

        const previousItems = this.snapshotCollection(collection, change.previous);
        const nextItems = this.snapshotCollection(collection, change.value);
        const itemEquals = collection.equals ?? Object.is;
        const itemKeys = new Set<unknown>([
            ...previousItems.keys(),
            ...nextItems.keys(),
        ]);

        for (const itemKey of itemKeys) {
            const previousItem = previousItems.get(itemKey);
            const nextItem = nextItems.get(itemKey);

            if (!previousItem && nextItem) {
                this.emitItemChange(listeners, {
                    key: change.key,
                    itemKey,
                    value: nextItem.item,
                    previous: undefined,
                    kind: 'added',
                    reason: change.reason,
                    sourceKey: change.sourceKey,
                });
                continue;
            }

            if (previousItem && !nextItem) {
                this.emitItemChange(listeners, {
                    key: change.key,
                    itemKey,
                    value: undefined,
                    previous: previousItem.item,
                    kind: 'removed',
                    reason: change.reason,
                    sourceKey: change.sourceKey,
                });
                continue;
            }

            if (previousItem && nextItem && !itemEquals(previousItem.item, nextItem.item)) {
                this.emitItemChange(listeners, {
                    key: change.key,
                    itemKey,
                    value: nextItem.item,
                    previous: previousItem.item,
                    kind: 'updated',
                    reason: change.reason,
                    sourceKey: change.sourceKey,
                });
            }
        }
    }

    private emitItemChange(
        listeners: Set<StateItemListener<unknown, unknown>>,
        change: StateItemChange<unknown, unknown>,
    ): void {
        for (const listener of Array.from(listeners)) {
            listener(change);
        }
    }

    private resolveCollectionDefinition(
        key: string,
        value: unknown,
        previous: unknown,
    ): StateCollectionDefinition<any, unknown, unknown> | undefined {
        const explicit = this.definitions.get(key)?.collection as StateCollectionDefinition<any, unknown, unknown> | undefined;
        const sample = value ?? previous;
        let inferred: StateCollectionDefinition<any, unknown, unknown> | undefined;

        if (Array.isArray(sample)) {
            inferred = DEFAULT_ARRAY_ITEMS;
        }
        else if (sample instanceof Set) {
            inferred = DEFAULT_SET_ITEMS;
        }
        else if (sample instanceof Map) {
            inferred = DEFAULT_MAP_ITEMS;
        }

        if (!explicit) {
            return inferred;
        }

        return {
            items: explicit.items ?? inferred?.items,
            keyOf: explicit.keyOf ?? inferred?.keyOf ?? DEFAULT_INDEX_KEY_OF,
            equals: explicit.equals ?? inferred?.equals,
        };
    }

    private snapshotCollection<TCollection, TItem, TItemKey>(
        collection: StateCollectionDefinition<TCollection, TItem, TItemKey>,
        value: TCollection | undefined,
    ): Map<TItemKey, CollectionSnapshotItem<TItem>> {
        const snapshot = new Map<TItemKey, CollectionSnapshotItem<TItem>>();
        if (value === undefined) {
            return snapshot;
        }

        if (!collection.items || !collection.keyOf) {
            return snapshot;
        }

        let index = 0;
        for (const item of collection.items(value)) {
            snapshot.set(collection.keyOf(item, index), { item, index });
            index += 1;
        }

        return snapshot;
    }

    private addDependent(sourceKey: string, dependentKey: string): void {
        if (!this.dependents.has(sourceKey)) {
            this.dependents.set(sourceKey, new Set());
        }

        this.dependents.get(sourceKey)?.add(dependentKey);
    }

    private removeDependent(sourceKey: string, dependentKey: string): void {
        const dependents = this.dependents.get(sourceKey);
        if (!dependents) {
            return;
        }

        dependents.delete(dependentKey);
        if (dependents.size === 0) {
            this.dependents.delete(sourceKey);
        }
    }

    private assertNoCycles(startKey: string): void {
        const visit = (key: string, path: string[]) => {
            const definition = this.definitions.get(key);
            if (!definition?.dependencies) {
                return;
            }

            for (const dependency of definition.dependencies) {
                if (dependency.key === startKey) {
                    throw new Error(`Circular state dependency detected: ${[...path, key, startKey].join(' -> ')}.`);
                }

                if (!path.includes(dependency.key)) {
                    visit(dependency.key, [...path, key]);
                }
            }
        };

        visit(startKey, []);
    }
}