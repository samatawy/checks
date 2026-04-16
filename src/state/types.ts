/**
 * Explains why a state value changed.
 */
export type StateChangeReason = 'set' | 'delete' | 'clear' | 'dependency';

/**
 * Describes one keyed state change delivered to subscribers.
 *
 * Example:
 * ```ts
 * store.subscribe<number>('count', change => {
 *   console.log(change.previous, change.value, change.reason);
 * });
 * ```
 */
export interface StateChange<T> {
    /** The state key that changed. */
    key: string;
    /** The new value after the change. */
    value: T | undefined;
    /** The previous value before the change. */
    previous: T | undefined;
    /** The reason the state changed. */
    reason: StateChangeReason;
    /** The dependency key that triggered a derived recomputation, when applicable. */
    sourceKey?: string;
}

/**
 * Describes one item-level change inside a collection state.
 */
export interface StateItemChange<TItem, TItemKey = unknown> {
    /** The state key whose collection changed. */
    key: string;
    /** The key of the changed item inside that collection. */
    itemKey: TItemKey;
    /** The new item value after the change. */
    value: TItem | undefined;
    /** The previous item value before the change. */
    previous: TItem | undefined;
    /** Whether the item was added, updated, or removed. */
    kind: 'added' | 'updated' | 'removed';
    /** The reason the parent state changed. */
    reason: StateChangeReason;
    /** The dependency key that triggered the parent change, when applicable. */
    sourceKey?: string;
}

/**
 * Listens for changes to one keyed state value.
 */
export type StateListener<T> = (change: StateChange<T>) => void;

/**
 * Listens for per-item changes inside a collection state.
 */
export type StateItemListener<TItem, TItemKey = unknown> = (change: StateItemChange<TItem, TItemKey>) => void;

/**
 * Declares that one state depends on another state key.
 *
 * Example:
 * ```ts
 * dependencies: [{
 *   key: 'count',
 *   predicate(change) {
 *     return typeof change.value === 'number' && change.value > 0;
 *   },
 * }]
 * ```
 */
export interface StateDependency {
    /** The upstream state key this definition depends on. */
    key: string;
    /** Optional gate that decides whether a dependency change should trigger recomputation. */
    predicate?: (change: StateChange<unknown>, store: import('./state.store').StateStore) => boolean;
}

/**
 * Describes how a collection-like state exposes items for item-level subscriptions.
 *
 * `TCollection` is the full value stored under the state key, while `TItem` is the
 * individual item emitted to item-level subscribers.
 *
 * Example:
 * ```ts
 * interface PagedPeople {
 *   total: number;
 *   items: PersonDto[];
 * }
 *
 * const peopleItems: StateCollectionDefinition<PagedPeople, PersonDto, string> = {
 *   items(collection) {
 *     return collection.items;
 *   },
 *   keyOf(person) {
 *     return person.id;
 *   },
 * };
 * ```
 */
export interface StateCollectionDefinition<TCollection, TItem = unknown, TItemKey = unknown> {
    /**
     * Returns the iterable of items contained in one stored collection value.
     *
     * This can be omitted for built-in collection shapes such as arrays, sets, and maps.
     */
    items?: (collection: TCollection) => Iterable<TItem>;
    /**
     * Returns a stable key for one item.
     *
     * When omitted, arrays use the item index, while sets and maps use the item value.
     */
    keyOf?: (item: TItem, index: number) => TItemKey;
    /** Optional equality used to detect item updates. */
    equals?: (left: TItem, right: TItem) => boolean;
}

/**
 * Configures one keyed state entry.
 *
 * Example:
 * ```ts
 * store.define<number>('doubleCount', {
 *   dependencies: [{ key: 'count' }],
 *   derive(state) {
 *     return (state.get<number>('count') ?? 0) * 2;
 *   },
 * });
 * ```
 */
export interface StateDefinition<T> {
    /** Optional initial value for non-derived state. */
    initialValue?: T;
    /** Optional equality used to suppress duplicate notifications. */
    equals?: (left: T | undefined, right: T | undefined) => boolean;
    /** Upstream states that should trigger derived recomputation. */
    dependencies?: readonly StateDependency[];
    /** Computes the state value from other keyed values. */
    derive?: (store: import('./state.store').StateStore) => T | undefined;
    /** Optional collection adapter for item-level subscriptions. */
    collection?: StateCollectionDefinition<T, any, any>;
}