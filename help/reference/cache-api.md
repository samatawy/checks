---
title: Cache API
group: Reference
category: API
---

# Cache API

This page describes the package's caching and typed store APIs and how they fit together.

These APIs provide a small typed runtime layer for in-memory caching and per-type CRUD orchestration.

## Overview

The main exports are:

- `TypeCache<T>` for one string-keyed cache
- `ObjectCache` for grouping `TypeCache` instances by runtime class
- `TypeStore<T, TKey, TCreate, TUpdate>` for one per-type CRUD contract
- `QueryableTypeStore<T, ...>` for optional filter-style query support
- `ObjectStore` for grouping `TypeStore` implementations by runtime class
- `CachedTypeStore<T, ...>` for `TypeStore` plus optional `ttl_ms`
- `QueryableCachedTypeStore<T, ...>` as a convenience type for optional query support plus `ttl_ms`
- `InMemoryTypeStore<T, ...>` for a reusable in-memory store implementation that is useful in tests
- `CachedObjectStore` for cache-backed store access
- `RuntimeType<T>`, `CacheType<T>`, `StoreType<T>`, `MaybePromise<T>`, `CachePredicate<T>`, `ListOptions`, `SortSpec`, `QueryParams`, `QueryExecutionOptions`, and `ItemEnvelope<T>` for shared cache/store typing

## `RuntimeType<T>`, `CacheType<T>`, and `StoreType<T>`

These aliases represent runtime constructors used as registry keys.

In practice, that means classes such as `PersonDto`, `InvoiceDto`, or `OrderRecord`.

`ObjectCache`, `ObjectStore`, and `CachedObjectStore` all use those runtime constructors to separate one type's cache or store implementation from another.

## `ListOptions`, `QueryParams`, `QueryExecutionOptions`, and `ItemEnvelope<T>`

`ListOptions` covers the shared lightweight list concerns:

- `page`
- `pageSize`
- `sort`

`QueryParams` extends that idea with a generic string-keyed filter object.

`QueryExecutionOptions` controls wrapper behavior around a query call.

- `cache` controls whether `CachedObjectStore.query(...)` should cache returned items

`ItemEnvelope<T>` is the shared result shape for `list(...)` and `query(...)`:

- `items` contains the returned entities
- `meta` can contain paging, totals, or cursor details
- `raw` can contain the untouched provider response when needed

`CachedObjectStore` uses `items` to cache returned objects automatically.

## `TypeStore<T, TKey, TCreate, TUpdate>`

`TypeStore` is the contract for one type-specific CRUD implementation.

It requires:

- `keyOf(value)` to produce the cache or store key for one value
- `canCache?(value)` when a store wants to prevent selected items from being cached
- `fetch(key)` to read one value
- `list(options?)` to read values for that type with optional paging and sorting
- `create(input)` to create one value
- `update(existing, input)` to update one value
- `delete(key)` to delete one value

The return types may be synchronous or asynchronous through `MaybePromise<T>`.

`TCreate` and `TUpdate` both default to `any` so simple implementations can stay concise.

That keeps the base contract easy to implement for small stores, while still allowing stricter explicit input types when a store needs them.

Typical uses:

- wrapping a database repository
- wrapping an API client
- wrapping an in-memory map in tests
- delegating validation and hydration to `ObjectFactory` before persistence

## `QueryableTypeStore<T, ...>`

`QueryableTypeStore` is an optional extension for stores that support richer filters.

It adds:

- `query(query)` returning `ItemEnvelope<T>`

Use it when paging and sorting are not enough and the backing store needs field-specific filters or search parameters.

## `TypeCache<T>`

`TypeCache<T>` is the lowest-level cache primitive.

Use it when you already know the string key and only need a cache for one value type.

Main methods:

- `has(key)`
- `size()`
- `keys()`
- `values()`
- `entries()`
- `getDefaultTTL()`
- `setDefaultTTL(ttl_ms?)`
- `set(key, value, ttl_ms?)`
- `setTTL(key, ttl_ms)`
- `setTTLWhere(ttl_ms, predicate)`
- `get(key)`
- `delete(key)`
- `deleteWhere(predicate)`
- `clear()`

`ttl_ms` is in milliseconds. If a default TTL is set, `set(...)` uses it whenever no per-entry TTL is supplied.

## `ObjectCache`

`ObjectCache` groups `TypeCache` instances by runtime class.

Use it when multiple classes need independent caches in the same process.

Main methods:

- `size()`
- `hasTypeCache(type)`
- `getTypeCache(type, default_ttl_ms?)`
- `setTypeDefaultTTL(type, default_ttl_ms?)`
- `has(type, key)`
- `set(type, key, value, ttl_ms?)`
- `setTTL(type, key, ttl_ms)`
- `setTTLWhere(type, ttl_ms, predicate)`
- `get(type, key)`
- `delete(type, key)`
- `deleteWhere(type, predicate)`
- `deleteTypeCache(type)`
- `clear()`

`ObjectCache.global` is a process-wide singleton instance.

## `ObjectStore`

`ObjectStore` is a registry of `TypeStore` implementations.

It does not validate, hydrate, cache, or persist anything by itself. It only routes calls to the registered per-type store.

Main methods:

- `size()`
- `hasTypeStore(type)`
- `registerTypeStore(type, store)`
- `getTypeStore(type)`
- `deleteTypeStore(type)`
- `clear()`
- `fetch(type, key)`
- `list(type, options?)`
- `query(type, query)` when the registered store supports `query(...)`
- `create(type, input)`
- `update(type, existing, input)`
- `delete(type, key)`

`ObjectStore.global` is a process-wide singleton instance.

## `CachedTypeStore<T, ...>`

`CachedTypeStore` extends `TypeStore` with one optional property:

- `ttl_ms`

When a `CachedTypeStore` with `ttl_ms` is registered in `CachedObjectStore`, that TTL becomes the default cache lifetime for that type.

## `QueryableCachedTypeStore<T, ...>`

`QueryableCachedTypeStore` is a convenience alias for `CachedTypeStore<T, ...> & QueryableTypeStore<T, ...>`.

Use it when a cached store supports richer query filters and should still cache returned items automatically.

## `CachedObjectStore`

`CachedObjectStore` wraps `ObjectStore` and `ObjectCache` together.

Behavior summary:

- `fetch(type, key)` reads cache first, then falls back to the backing store, then caches the result
- `list(type, options?)` reads from the backing store and caches each returned item in `items`
- `query(type, query)` on `ObjectStore` delegates directly to the registered query-capable store
- `query(type, query, options?)` on `CachedObjectStore` caches each returned item in `items` unless `options.cache` is `false`
- `create(type, input)` writes through to the backing store and caches the returned item
- `update(type, existing, input)` writes through to the backing store and caches the updated item
- `delete(type, key)` deletes through the backing store and removes the cached entry

If a store provides `canCache?(item)`, `CachedObjectStore` checks it before saving any object into the typed cache.
- `getCached(type, key)` reads from cache only

It also exposes:

- `store` for the underlying `ObjectStore`
- `cache` for the underlying `ObjectCache`

`CachedObjectStore.global` is a process-wide singleton instance.

## `InMemoryTypeStore<T, ...>`

`InMemoryTypeStore` is a reusable in-memory implementation of `QueryableCachedTypeStore`.

It is intended for:

- tests that need a small local `TypeStore`
- examples and demos that should avoid external infrastructure
- lightweight adapters that keep data in process

It stores values in an internal `Map<string, T>` and provides built-in:

- `fetch(key)`
- `list(options?)` with sorting and paging
- `query(query)` with default equality-based filtering
- `create(input)`
- `update(existing, input)`
- `delete(key)`

Constructor options let you customize:

- `keyOf(value)` for storage keys
- `initialValues` for seed data
- `ttl_ms` and `canCache(...)` for `CachedObjectStore` integration
- `create(...)` and `update(...)` when inputs differ from the stored type
- `matchesQuery(...)` for custom query behavior
- `fieldValue(...)` for custom sorting or default query-field resolution

When `create(...)` is not supplied, the default implementation treats the input as the stored type.

When `update(...)` is not supplied, the default implementation shallow-merges object inputs onto the existing value while preserving its prototype.

## Typical Layering

The intended layering is:

1. `ObjectFactory` validates and hydrates one object when a class owns that logic.
2. One `TypeStore` implementation decides how that object is persisted.
3. `ObjectStore` routes CRUD calls to that store.
4. `CachedObjectStore` adds in-memory caching around those operations.

That keeps validation, persistence, and caching separate while still letting them compose cleanly.

## See Also

- [Object Caching](../how-to/object-caching.md) for task-oriented recipes
- [Object Factory](../how-to/object-factory.md) for validated construction and update flows
