---
title: Object Factory
group: Guides
category: Object Hydration
---

# Object Factory

This guide covers `ObjectFactory`, which combines validation and object creation.

Use it when you want to validate plain input first and only then hydrate a typed class instance.

## Required Static Methods

The class does not need to extend a base class, but it must expose two static methods:

- `validateInput(input)` returning an `ObjectCheck` or `Promise<ObjectCheck>`
- `fromValidInput(input)` returning the hydrated instance

`validateInput(...)` defines how the class validates raw input.

`fromValidInput(...)` is only called after validation succeeds, so it can focus on construction, setters, constructor parameters, private fields, or other invariants.

`ObjectFactory.create(...)`, `ObjectFactory.createOrThrow(...)`, and `ObjectFactory.createOrErrors(...)` all require that static contract at compile time.

## Create A Validated Object

```ts
import {
  ObjectCheck,
  ObjectFactory,
  required,
  string,
  type,
} from '@samatawy/checks';

class PersonDto {
  @required()
  @type.string()
  @string.minLength(2)
  name!: string;

  private constructor(private readonly personName: string) {}

  static async validateInput(input: unknown): Promise<ObjectCheck> {
    return ObjectCheck.for(input).matchesType(PersonDto);
  }

  static fromValidInput(input: any): PersonDto {
    return new PersonDto(input.name);
  }
}

const created = await ObjectFactory.create({ name: 'Ada' }, PersonDto);

if (!created.valid) {
  console.log(created.result({ nested: true, flattened: true, language: 'en' }));
} else {
  console.log(created.instance);
}
```

## Throw On Invalid Input

If you want a direct instance and prefer exceptions for invalid input, use `ObjectFactory.createOrThrow(...)`.

```ts
const person = await ObjectFactory.createOrThrow({ name: 'Ada' }, PersonDto);
```

## Return Errors Instead Of Throwing

If you prefer a non-throwing shortcut, use `ObjectFactory.createOrErrors(...)`.

```ts
const created = await ObjectFactory.createOrErrors({ name: 'A' }, PersonDto);

if (created.errors) {
  console.log(created.errors);
} else {
  console.log(created.instance);
}
```

This returns one of these shapes:

- `{ instance }` when validation succeeds
- `{ errors }` when validation fails

Use `ObjectFactory.create(...)` when you want the full `ObjectFactory` object and access to `check` or `result(options?)`.

## Why This Pattern Exists

This pattern works well for classes that need:

- private or protected state
- constructor parameters
- setter-based normalization
- post-validation invariants

Validation stays reusable and generic, while hydration stays inside the class where object construction logic belongs.