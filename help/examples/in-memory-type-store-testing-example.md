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
import { ObjectStore } from '@samatawy/checks';

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

  removeTag(tag: string): PersonDto {
    return new PersonDto(
      this.id,
      this.name,
      this.active,
      this.tags.filter(value => value !== tag),
    );
  }
}

interface PersonTagActions {
  addTag(id: string, tag: string): Promise<PersonDto | undefined>;
  removeTag(id: string, tag: string): Promise<PersonDto | undefined>;
}

class PersonService {
  constructor(
    private readonly people: ObjectStore,
    private readonly personTags: PersonTagActions,
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

  // Custom domain action: this is outside the base ObjectStore and TypeStore APIs.
  async tagPerson(id: string, tag: string): Promise<PersonDto | undefined> {
    return this.personTags.addTag(id, tag);
  }

  // Custom domain action: this is outside the base ObjectStore and TypeStore APIs.
  async untagPerson(id: string, tag: string): Promise<PersonDto | undefined> {
    return this.personTags.removeTag(id, tag);
  }
}
```

## Build The Test Store

```ts
import { InMemoryTypeStore, ObjectStore } from '@samatawy/checks';

// Test-only in-memory implementation that also provides the custom domain actions.
class PersonMemoryStore extends InMemoryTypeStore<
  PersonDto,
  string,
  PersonDto,
  { name?: string; active?: boolean; tags?: string[] },
  { active?: boolean; page?: number; pageSize?: number; sort?: { by: string; direction?: 'asc' | 'desc' } }
> implements PersonTagActions {
  constructor() {
    super({
      keyOf(person) {
        return person.id;
      },
      initialValues: [
        new PersonDto('2', 'Grace', false, []),
        new PersonDto('1', 'Ada', true, ['core']),
      ],
    });
  }

  // Custom domain method: this is not part of InMemoryTypeStore or TypeStore.
  async addTag(id: string, tag: string): Promise<PersonDto | undefined> {
    const existing = await this.fetch(id);
    if (!existing) {
      return undefined;
    }

    const updated = existing.addTag(tag);
    await this.update(existing, { tags: updated.tags });
    return updated;
  }

  // Custom domain method: this is not part of InMemoryTypeStore or TypeStore.
  async removeTag(id: string, tag: string): Promise<PersonDto | undefined> {
    const existing = await this.fetch(id);
    if (!existing) {
      return undefined;
    }

    const updated = existing.removeTag(tag);
    await this.update(existing, { tags: updated.tags });
    return updated;
  }
}

const personStore = new PersonMemoryStore();

ObjectStore.global.clear();
ObjectStore.global.registerTypeStore(PersonDto, personStore);

const service = new PersonService(ObjectStore.global, personStore);
```

For a compact example, this uses `ObjectStore.global`. In real test suites, clear it before each test so registrations do not leak across cases.

This works without custom hooks because:

- `create(input)` defaults to storing the input value directly
- `update(existing, patch)` defaults to shallow-merging object properties while preserving the original prototype
- `query(query)` defaults to equality-based filtering for non-pagination fields
- `list(...)` and `query(...)` support paging and sorting out of the box

The custom domain action is layered on top:

- `InMemoryTypeStore` keeps the shared CRUD and query behavior
- `PersonTagActions` describes the extra domain-specific behavior the service needs
- `PersonMemoryStore` extends `InMemoryTypeStore` and implements `PersonTagActions`
- `PersonService` stays focused on the behavior under test and does not need to know how the test store is implemented

## Example Vitest Test

```ts
import { describe, expect, it } from 'vitest';

describe('PersonService', () => {
  it('activates a person and handles tag actions through InMemoryTypeStore', async () => {
    const activated = await service.activatePerson('2');

    expect(activated).toEqual(new PersonDto('2', 'Grace', true, []));

    const tagged = await service.tagPerson('2', 'reviewed');

    expect(tagged).toEqual(new PersonDto('2', 'Grace', true, ['reviewed']));

    const untagged = await service.untagPerson('1', 'core');

    expect(untagged).toEqual(new PersonDto('1', 'Ada', true, []));

    const activePeople = await service.listActivePeople();

    expect(activePeople).toEqual([
      new PersonDto('1', 'Ada', true, []),
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

For custom domain-related actions, a good pattern is to subclass `InMemoryTypeStore` with a domain-specific store that exposes methods such as `addTag(...)` and `removeTag(...)`.

## Why This Is Useful

- Your tests stay close to the package's real store abstractions.
- Business logic can be exercised without network or database setup.
- Domain-specific actions can still be tested explicitly without forcing them into the generic `TypeStore` surface.