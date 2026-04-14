---
title: Shared Model
group: Examples
category: Caching And Stores
---

# Shared Model

These examples use the same DTO and request/query shapes on both the client and the server. Keeping that model stable makes the `TypeStore` implementations easier to reason about.

They also demonstrate that your DTO and store layer can expose custom domain-related actions that are not part of the base `TypeStore` API. In this example, a person can add or remove tags.

## Person DTO

```ts
import {
  ObjectCheck,
  required,
  string,
  type,
  validateClass,
} from '@samatawy/checks';

export class PersonDto {
  @required()
  @type.string()
  id!: string;

  @required()
  @type.string()
  @string.minLength(2)
  name!: string;

  @type.string()
  title?: string;

  tags: string[] = [];

  constructor(
    public readonly personId: string,
    public readonly personName: string,
    public readonly personTitle?: string,
    public readonly personTags: string[] = [],
  ) {}

  static async validateInput(input: unknown): Promise<ObjectCheck> {
    return validateClass(input, PersonDto);
  }

  static fromValidInput(input: any): PersonDto {
    return new PersonDto(input.id, input.name, input.title, input.tags ?? []);
  }

  static async validateUpdate(existing: PersonDto, input: unknown): Promise<ObjectCheck> {
    return ObjectCheck.for(input)
      .updating({
        id: existing.personId,
        name: existing.personName,
        title: existing.personTitle,
        tags: existing.personTags,
      })
      .check(root => [
        root.optional('id').string().immutable(),
        root.optional('name').string().minLength(2),
        root.optional('title').string(),
        root.optional('tags').array().items(item => item.string()),
      ]);
  }

  static updateFrom(existing: PersonDto, input: any): PersonDto {
    return new PersonDto(
      existing.personId,
      input.name ?? existing.personName,
      input.title ?? existing.personTitle,
      input.tags ?? existing.personTags,
    );
  }

  addTag(tag: string): PersonDto {
    if (this.personTags.includes(tag)) {
      return this;
    }

    return new PersonDto(
      this.personId,
      this.personName,
      this.personTitle,
      [...this.personTags, tag],
    );
  }

  removeTag(tag: string): PersonDto {
    return new PersonDto(
      this.personId,
      this.personName,
      this.personTitle,
      this.personTags.filter(value => value !== tag),
    );
  }
}
```

## Shared Input And Query Types

```ts
export type CreatePersonInput = {
  id: string;
  name: string;
  title?: string;
  tags?: string[];
};

export type UpdatePersonInput = {
  name?: string;
  title?: string;
  tags?: string[];
};

export type AddTagInput = {
  tag: string;
};

export type PersonQuery = {
  title?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
};
```

## Shared Serialization Helper

```ts
export function personToJson(person: PersonDto) {
  return {
    id: person.personId,
    name: person.personName,
    title: person.personTitle,
    tags: person.personTags,
  };
}
```

The [Client using http](object-caching-http-example.md) example consumes that JSON shape, and the [Server using Mongodb](object-caching-mongodb-express-example.md) example produces it from Express endpoints.

The important design point is that `addTag(...)` and `removeTag(...)` are domain methods. They are not part of the generic `TypeStore` API, but your concrete stores and services can still support them explicitly.