---
title: Unit testing with InMemoryTypeStore
group: Examples
category: Testing
---

# Unit testing with InMemoryTypeStore

This example shows a common testing pattern: use `InMemoryTypeStore` as a lightweight repository or service dependency inside a unit test.

The goal is to avoid rewriting the same `Map`-backed mock for each test suite while still keeping behavior explicit and type-safe.

It also shows how to support custom domain-related actions, such as tag management, without changing the base `TypeStore` API.

## Scenario

Assume production code depends on a person repository with CRUD, query, and tag-management behavior. In tests, we want to:

- seed a few people
- exercise business logic without an HTTP server or database
- verify reads, updates, queries, and domain-specific tag changes against predictable in-memory data

## DTO And Service Under Test

```ts
class PersonDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly active: boolean,
    public readonly tags: string[] = [],
  ) {}

  addTag(tag: string): PersonDto {
    if (this.tags.includes(tag)) {
      return this;
    }

    return new PersonDto(this.id, this.name, this.active, [...this.tags, tag]);
  }
}

class PersonTestStore {
  constructor(public readonly store: InMemoryTypeStore<PersonDto, string, PersonDto, { name?: string; active?: boolean; tags?: string[] }, { active?: boolean; page?: number; pageSize?: number; sort?: { by: string; direction?: 'asc' | 'desc' } }>) {}

  async addTag(id: string, tag: string): Promise<PersonDto | undefined> {
    const existing = await this.store.fetch(id);
    if (!existing) {
      return undefined;
    }

    const updated = existing.addTag(tag);
    await this.store.update(existing, { tags: updated.tags });
    return updated;
  }
}

class PersonService {
  constructor(
    private readonly people: ObjectStore,
    private readonly personStore: PersonTestStore,
  ) {}

  async activatePerson(id: string): Promise<PersonDto | undefined> {
    const existing = await this.people.fetch(PersonDto, id);
    if (!existing) {
      return undefined;
    }

    return this.people.update(PersonDto, existing, { active: true });
  }

  async listActivePeople(): Promise<PersonDto[]> {
    const result = await this.people.query(PersonDto, { active: true, sort: { by: 'name', direction: 'asc' } });
    return result.items;
  }

  async tagPerson(id: string, tag: string): Promise<PersonDto | undefined> {
    return this.personStore.addTag(id, tag);
  }
}
```

## Build The Test Store

```ts
import { InMemoryTypeStore, ObjectStore } from '@samatawy/checks';

const personRecords = new InMemoryTypeStore<
  PersonDto,
  string,
  PersonDto,
  { name?: string; active?: boolean; tags?: string[] },
  { active?: boolean; page?: number; pageSize?: number; sort?: { by: string; direction?: 'asc' | 'desc' } }
>({
  keyOf(person) {
    return person.id;
  },
  initialValues: [
    new PersonDto('2', 'Grace', false, []),
    new PersonDto('1', 'Ada', true, ['core']),
  ],
});

const personStore = new PersonTestStore(personRecords);
const store = new ObjectStore().registerTypeStore(PersonDto, personRecords);
const service = new PersonService(store, personStore);
```

This works without custom hooks because:

- `create(input)` defaults to storing the input value directly
- `update(existing, patch)` defaults to shallow-merging object properties while preserving the original prototype
- `query(query)` defaults to equality-based filtering for non-pagination fields
- `list(...)` and `query(...)` support paging and sorting out of the box

The custom domain action is layered on top:

- `InMemoryTypeStore` keeps the shared CRUD and query behavior
- `PersonTestStore` adds `addTag(...)` for test-only or domain-specific flows
- `PersonService` can depend on both the generic store API and the explicit custom action

## Example Vitest Test

```ts
import { describe, expect, it } from 'vitest';

describe('PersonService', () => {
  it('activates a person and handles tag actions through InMemoryTypeStore', async () => {
    const activated = await service.activatePerson('2');

    expect(activated).toEqual(new PersonDto('2', 'Grace', true, []));

    const tagged = await service.tagPerson('2', 'reviewed');

    expect(tagged).toEqual(new PersonDto('2', 'Grace', true, ['reviewed']));

    const activePeople = await service.listActivePeople();

    expect(activePeople).toEqual([
      new PersonDto('1', 'Ada', true, ['core']),
      new PersonDto('2', 'Grace', true, ['reviewed']),
    ]);
  });
});
```

## When To Add Custom Hooks

Use the default behavior when your stored values are already the same shape you want in tests.

Add hooks only when the test store needs more control:

- `create(...)` if create inputs differ from stored values
- `update(...)` if patching should build a new class instance explicitly
- `matchesQuery(...)` if query logic is more complex than equality checks
- `fieldValue(...)` if sorting or default query fields should map to different property names
- `canCache(...)` and `ttl_ms` if the same store should also be registered in `CachedObjectStore`

For custom domain-related actions, a good pattern is to wrap `InMemoryTypeStore` in a specialized test store or subclass that exposes methods such as `addTag(...)` and `removeTag(...)`.

## Why This Is Useful

- Your tests stay close to the package's real store abstractions.
- Business logic can be exercised without network or database setup.
- The store stays reusable across many test files instead of living as a one-off mock in each suite.
- Domain-specific actions can still be tested explicitly without forcing them into the generic `TypeStore` surface.