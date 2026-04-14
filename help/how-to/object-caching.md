---
title: Object Caching
group: Guides
category: Caching And Stores
---

# Object Caching

This guide covers the package's caching and typed store features and shows how to use them for typed in-memory caching, per-type stores, and cache-backed CRUD flows.

Use these helpers when you want a small in-process cache next to your validation and object-hydration workflows.

The main pieces are:

- `TypeCache<T>` for string-keyed caching of one value type
- `ObjectCache` for grouping `TypeCache` instances by runtime class
- `ObjectStore` for grouping per-type CRUD implementations
- `CachedObjectStore` for cache-backed reads and cache-synchronized create, update, and delete flows

## When To Use These Helpers

This layer fits well when:

- you already work with typed DTO or domain classes
- you want a small in-memory cache without adding another dependency
- different runtime types need different fetch, create, update, and delete logic
- validation and hydration already live in classes or service methods

This layer is not intended to replace a database client or distributed cache.

## Cache One Type Directly

Use `TypeCache<T>` when you only need a keyed in-memory cache for one type.

```ts
import { TypeCache } from '@samatawy/checks';

class PersonDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}
}

const cache = new TypeCache<PersonDto>(60_000);

cache.set('1', new PersonDto('1', 'Ada'));

const person = cache.get('1');

cache.setTTLWhere(5_000, (key, value) => value.name.startsWith('A'));
cache.deleteWhere((key) => key.startsWith('temp:'));
```

Use `ObjectCache` when the same process needs separate caches for multiple classes.

```ts
import { ObjectCache } from '@samatawy/checks';

class PersonDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}
}

const cache = new ObjectCache();

cache.set(PersonDto, '1', new PersonDto('1', 'Ada'), 60_000);

const person = cache.get(PersonDto, '1');
```

`ObjectCache` creates a separate `TypeCache<T>` for each runtime class and can also set a default TTL per type.

## Register A Store For One Type

Use `ObjectStore` when you want one registry that delegates typed CRUD work to per-type store implementations.

You can implement a `TypeStore` either as a plain object literal or as a dedicated class instance.

Use the object-literal style when the example should stay short and self-contained.

```ts
import { ObjectStore, type TypeStore } from '@samatawy/checks';

class PersonDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}
}

const records = new Map<string, PersonDto>();

const personStore: TypeStore<PersonDto, string, { id: string; name: string }, { name?: string }> = {
  keyOf(person) {
    return person.id;
  },
  async fetch(id) {
    return records.get(id);
  },
  async list(options) {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? records.size;
    const items = Array.from(records.values()).slice((page - 1) * pageSize, page * pageSize);

    return {
      items,
      meta: {
        page,
        pageSize,
        total: records.size,
      },
    };
  },
  async create(input) {
    const person = new PersonDto(input.id, input.name);
    records.set(person.id, person);
    return person;
  },
  async update(existing, input) {
    const person = new PersonDto(existing.id, input.name ?? existing.name);
    records.set(person.id, person);
    return person;
  },
  async delete(id) {
    return records.delete(id);
  },
};

const store = new ObjectStore().registerTypeStore(PersonDto, personStore);

const created = await store.create(PersonDto, { id: '1', name: 'Ada' });
const listed = await store.list(PersonDto, { page: 1, pageSize: 20, sort: { by: 'name' } });
```

Use a class when the store needs constructor dependencies, internal helpers, or state that should not live in module scope.

```ts
import { ObjectStore, type TypeStore } from '@samatawy/checks';

class PersonDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}
}

const records = new Map<string, PersonDto>();

class PersonStore implements TypeStore<PersonDto, string, { id: string; name: string }, { name?: string }> {
  constructor(private readonly records: Map<string, PersonDto>) {}

  keyOf(person: PersonDto): string {
    return person.id;
  }

  async fetch(id: string) {
    return this.records.get(id);
  }

  async list(options) {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? this.records.size;
    const items = Array.from(this.records.values()).slice((page - 1) * pageSize, page * pageSize);

    return {
      items,
      meta: {
        page,
        pageSize,
        total: this.records.size,
      },
    };
  }

  async create(input: { id: string; name: string }) {
    const person = new PersonDto(input.id, input.name);
    this.records.set(person.id, person);
    return person;
  }

  async update(existing: PersonDto, input: { name?: string }) {
    const person = new PersonDto(existing.id, input.name ?? existing.name);
    this.records.set(person.id, person);
    return person;
  }

  async delete(id: string) {
    return this.records.delete(id);
  }
}

const store = new ObjectStore().registerTypeStore(PersonDto, new PersonStore(records));

const created = await store.create(PersonDto, { id: '1', name: 'Ada' });
const listed = await store.list(PersonDto, { page: 1, pageSize: 20, sort: { by: 'name' } });
```

Both styles satisfy the same `TypeStore` contract. Use object literals for small local adapters and classes for real application services.

If you want a reusable local store for tests or demos, use `InMemoryTypeStore<T, ...>` instead of rewriting the same `Map`-backed CRUD class each time.

`TypeStore<T, TKey, TCreate, TUpdate>` defaults `TCreate` and `TUpdate` to `any` so you can start with a lightweight implementation and add stricter input types only when they add value.

`ObjectStore` itself does not know how to validate, hydrate, or persist one type. That logic belongs inside each `TypeStore` implementation.

## Add Cache-Backed Reads And Writes

Use `CachedObjectStore` when you want `fetch(...)` to read from cache first and CRUD operations to keep the cache in sync.

```ts
import { CachedObjectStore } from '@samatawy/checks';

class PersonDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}
}

const records = new Map<string, PersonDto>();

const store = new CachedObjectStore().registerTypeStore(PersonDto, {
  ttl_ms: 60_000,
  keyOf(person) {
    return person.id;
  },
  async fetch(id: string) {
    return records.get(id);
  },
  async list(options) {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? records.size;
    const items = Array.from(records.values()).slice((page - 1) * pageSize, page * pageSize);

    return {
      items,
      meta: {
        page,
        pageSize,
        total: records.size,
      },
    };
  },
  async create(input: { id: string; name: string }) {
    const person = new PersonDto(input.id, input.name);
    records.set(person.id, person);
    return person;
  },
  async update(existing: PersonDto, input: { name?: string }) {
    const person = new PersonDto(existing.id, input.name ?? existing.name);
    records.set(person.id, person);
    return person;
  },
  async delete(id: string) {
    return records.delete(id);
  },
});

await store.create(PersonDto, { id: '1', name: 'Ada' });

const first = await store.fetch(PersonDto, '1');
const second = await store.fetch(PersonDto, '1');
const listed = await store.list(PersonDto, { page: 1, pageSize: 20, sort: { by: 'name' } });

console.log(first);
console.log(second);
console.log(listed.items);
console.log(store.getCached(PersonDto, '1'));
```

`CachedObjectStore` uses the registered store's `keyOf(...)` result to cache created, listed, fetched, and updated objects.

`list(...)` now accepts optional paging and sorting and returns an envelope with `items` plus optional metadata.

If your store needs richer filtering, add `query(...)` and return the same envelope shape.

When you want one query to avoid writing returned items into the cache, call `store.query(type, query, { cache: false })`.

## Use ObjectFactory Inside A TypeStore

`ObjectFactory` and `TypeStore` work well together, but they should stay separate.

`ObjectFactory` decides whether raw input is valid and how to hydrate or update one class instance.

`TypeStore` decides how that type is fetched, created, updated, listed, and deleted in your application.

That means the usual pattern is to delegate create and update validation to `ObjectFactory` inside your `TypeStore` implementation.

```ts
import {
  CachedObjectStore,
  ObjectCheck,
  ObjectFactory,
  validateClass,
} from '@samatawy/checks';

class PersonDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly title?: string,
  ) {}

  static async validateInput(input: unknown): Promise<ObjectCheck> {
    return validateClass(input, PersonDto);
  }

  static fromValidInput(input: any): PersonDto {
    return new PersonDto(input.id, input.name, input.title);
  }

  static async validateUpdate(existing: PersonDto, input: unknown): Promise<ObjectCheck> {
    return ObjectCheck.for(input)
      .updating(existing)
      .check(root => [
        root.optional('name').string().minLength(2),
        root.optional('title').string(),
      ]);
  }

  static updateFrom(existing: PersonDto, input: any): PersonDto {
    return new PersonDto(
      existing.id,
      input.name ?? existing.name,
      input.title ?? existing.title,
    );
  }
}

const records = new Map<string, PersonDto>();

const store = new CachedObjectStore().registerTypeStore(PersonDto, {
  ttl_ms: 60_000,
  keyOf(person) {
    return person.id;
  },
  canCache(person) {
    return person.title !== 'draft';
  },
  async fetch(id: string) {
    return records.get(id);
  },
  async list(options) {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? records.size;
    const items = Array.from(records.values()).slice((page - 1) * pageSize, page * pageSize);

    return {
      items,
      meta: {
        page,
        pageSize,
        total: records.size,
      },
    };
  },
  async query(query: { title?: string }) {
    const items = Array.from(records.values()).filter(person => {
      return query.title ? person.title === query.title : true;
    });

    return {
      items,
      meta: {
        total: items.length,
      },
    };
  },
  async create(input: unknown) {
    const person = await ObjectFactory.createOrThrow(input, PersonDto);
    records.set(person.id, person);
    return person;
  },
  async update(existing: PersonDto, input: unknown) {
    const person = await ObjectFactory.updateOrThrow(existing, input, PersonDto);
    records.set(person.id, person);
    return person;
  },
  async delete(id: string) {
    return records.delete(id);
  },
});
```

That keeps responsibilities clear:

- `ObjectFactory` handles validation and hydration
- the `TypeStore` handles persistence and key mapping
- `CachedObjectStore` handles cache behavior around the store

When `list(...)` or `query(...)` returns an envelope, `CachedObjectStore` automatically caches every object in `items`.

If the store provides `canCache?(item)`, that hook is checked before each item is saved to the typed cache.

## Global Registries

All three registry-style classes expose a shared process-wide singleton:

- `ObjectCache.global`
- `ObjectStore.global`
- `CachedObjectStore.global`

Use these only when process-wide shared state is actually what you want. In tests and request-scoped application code, explicit instances are usually easier to reason about.

## See Also

- [Object Factory](object-factory.md) for validated construction and update flows
- [HTTP Store Example](../examples/object-caching-http-example.md) for an end-to-end example with HTTP calls and cached DTO hydration
- [Cache API](../reference/cache-api.md) for the caching and typed-store reference page

