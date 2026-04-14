---
title: Client using http
group: Examples
category: Caching And Stores
---

# Client using http

This example shows the client-side half of the flow. It uses `CachedObjectStore` in front of a `PersonApiStore` that talks to an HTTP API.

Start with the shared DTO and request/query types from [Shared Model](shared-model.md). This page focuses only on the HTTP client store.

It also shows custom domain-related actions that are not part of `TypeStore`: adding and removing tags on a person.

The responsibilities are:

- the shared model defines `PersonDto`, `CreatePersonInput`, `UpdatePersonInput`, `AddTagInput`, and `PersonQuery`
- `PersonApiStore` sends HTTP requests and hydrates DTO instances from JSON payloads
- `CachedObjectStore` adds in-memory caching on top of the client store

## Scenario

Assume an API under `/api/people` that returns JSON payloads such as:

```json
{
  "id": "1",
  "name": "Ada",
  "title": "Architect"
}
```

## HTTP-Backed PersonApiStore

```ts
import {
  CachedObjectStore,
  ObjectFactory,
  type ItemEnvelope,
  type QueryableCachedTypeStore,
} from '@samatawy/checks';
import { AddTagInput, CreatePersonInput, PersonDto, PersonQuery, UpdatePersonInput } from './shared-model';

class PersonApiStore implements QueryableCachedTypeStore<PersonDto, string, CreatePersonInput, UpdatePersonInput, PersonQuery> {
  public readonly ttl_ms = 30_000;

  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  keyOf(person: PersonDto): string {
    return person.personId;
  }

  canCache(person: PersonDto): boolean {
    return person.personTitle !== 'Draft';
  }

  async fetch(id: string): Promise<PersonDto | undefined> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/people/${id}`);
    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch person ${id}: ${response.status}`);
    }

    const payload = await response.json();
    return await ObjectFactory.createOrThrow(payload, PersonDto);
  }

  async list(options?: PersonQuery): Promise<ItemEnvelope<PersonDto>> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/people`);
    if (!response.ok) {
      throw new Error(`Failed to list people: ${response.status}`);
    }

    const payload = await response.json() as unknown[];
    const items = await Promise.all(payload.map(item => ObjectFactory.createOrThrow(item, PersonDto)));

    return {
      items,
      meta: {
        page: options?.page ?? 1,
        pageSize: options?.pageSize ?? items.length,
        total: items.length,
      },
      raw: payload,
    };
  }

  async query(query: PersonQuery): Promise<ItemEnvelope<PersonDto>> {
    const params = new URLSearchParams();
    if (query.title) {
      params.set('title', query.title);
    }
    if (query.tag) {
      params.set('tag', query.tag);
    }
    if (query.page !== undefined) {
      params.set('page', String(query.page));
    }
    if (query.pageSize !== undefined) {
      params.set('pageSize', String(query.pageSize));
    }

    const response = await this.fetchImpl(`${this.baseUrl}/api/people/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to query people: ${response.status}`);
    }

    const payload = await response.json() as unknown[];
    const items = await Promise.all(payload.map(item => ObjectFactory.createOrThrow(item, PersonDto)));

    return {
      items,
      meta: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? items.length,
        total: items.length,
      },
      raw: payload,
    };
  }

  async create(input: CreatePersonInput): Promise<PersonDto> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/people`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Failed to create person: ${response.status}`);
    }

    const payload = await response.json();
    return await ObjectFactory.createOrThrow(payload, PersonDto);
  }

  async update(existing: PersonDto, input: UpdatePersonInput): Promise<PersonDto> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/people/${existing.personId}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Failed to update person ${existing.personId}: ${response.status}`);
    }

    const payload = await response.json();
    return await ObjectFactory.updateOrThrow(existing, payload, PersonDto);
  }

  async delete(id: string): Promise<boolean> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/people/${id}`, {
      method: 'DELETE',
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      throw new Error(`Failed to delete person ${id}: ${response.status}`);
    }

    return true;
  }

  async addTag(personId: string, input: AddTagInput): Promise<PersonDto> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/people/${personId}/tags`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Failed to add tag to person ${personId}: ${response.status}`);
    }

    const payload = await response.json();
    return await ObjectFactory.createOrThrow(payload, PersonDto);
  }

  async removeTag(personId: string, tag: string): Promise<PersonDto> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/people/${personId}/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to remove tag from person ${personId}: ${response.status}`);
    }

    const payload = await response.json();
    return await ObjectFactory.createOrThrow(payload, PersonDto);
  }
}
```

## Register The Store In CachedObjectStore

```ts
const personApi = new PersonApiStore('https://example.com');

const people = new CachedObjectStore().registerTypeStore(
  PersonDto,
  personApi,
);
```

## Notes

- This example assumes the server returns the JSON shape defined in [Shared Model](shared-model.md).
- `ObjectFactory.createOrThrow(...)` and `ObjectFactory.updateOrThrow(...)` keep the client-side DTOs validated even when the server response is untrusted.
- `CachedObjectStore.query(PersonDto, query, { cache: false })` can be useful when a search result is highly volatile.

## Use The Cached Store

```ts
const created = await people.create(PersonDto, {
  id: '1',
  name: 'Ada',
  title: 'Architect',
});

const firstFetch = await people.fetch(PersonDto, '1');
const secondFetch = await people.fetch(PersonDto, '1');
const listed = await people.list(PersonDto, { page: 1, pageSize: 20, sort: { by: 'name' } });
const queried = await people.query(PersonDto, { title: 'Architect', page: 1, pageSize: 20 }, { cache: false });

const updated = await people.update(PersonDto, created, {
  title: 'Chief Architect',
});

const tagged = await personApi.addTag(updated.personId, { tag: 'team-lead' });
const untagged = await personApi.removeTag(tagged.personId, 'team-lead');

await people.delete(PersonDto, untagged.personId);
```

Behavior summary:

- `create(...)` calls the HTTP API and caches the returned `PersonDto`
- the first `fetch(...)` uses the backing store when the value is not cached yet
- the second `fetch(...)` can return directly from cache
- `list(...)` and `query(...)` cache every returned object in `items` unless query caching is disabled for that call
- `update(...)` refreshes the cached value with the updated DTO
- `delete(...)` removes the cached entry after the backing delete call

For custom domain actions:

- `addTag(...)` and `removeTag(...)` live on the concrete `PersonApiStore`, not on `TypeStore`
- those methods use dedicated endpoints because they represent domain behavior, not generic CRUD
- they can still return validated `PersonDto` objects and participate in the same client-side flow

## Why This Pattern Works

This pattern scales well because each layer keeps one job:

- the DTO owns validation and hydration rules
- the store owns network calls and error handling
- the cached store owns cache behavior

That keeps HTTP concerns out of `ObjectFactory` and validation concerns out of `CachedObjectStore`.

It also keeps custom domain-related actions explicit instead of trying to force them through the generic store contract.

## See Also

- [Object Caching](../how-to/object-caching.md) for the main caching guide
- [Object Factory](../how-to/object-factory.md) for validated construction and update flows
- [Cache API](../reference/cache-api.md) for the caching and typed-store reference page
