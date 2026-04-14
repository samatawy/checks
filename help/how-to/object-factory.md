---
title: Object Factory
group: Guides
category: Object Hydration
---

# Object Factory

This guide covers `ObjectFactory`, which combines validation with object creation or update.

Use it when you want to validate plain input first and only then hydrate a typed class instance.

`ObjectFactory.create(...)` and `ObjectFactory.update(...)` return an `ObjectFactory<T>` wrapper instead of just returning `T`.

That wrapper is useful because it keeps both sides of the operation together:

- the validation output through `result(options?)` and `check`
- the hydrated instance through `instance` when validation succeeds
- the success state through `valid`

In practice, that gives one object that can drive either API-style error reporting or domain-object hydration without forcing you to choose one upfront.

## Required Static Methods

For create flows, the class does not need to extend a base class, but it must expose two static methods:

- `validateInput(input)` returning an `ObjectCheck` or `Promise<ObjectCheck>`
- `fromValidInput(input)` returning the hydrated instance

`validateInput(...)` defines how the class validates raw input.

`fromValidInput(...)` is only called after validation succeeds, so it can focus on construction, setters, constructor parameters, private fields, or other invariants.

`ObjectFactory.create(...)`, `ObjectFactory.createOrThrow(...)`, and `ObjectFactory.createOrErrors(...)` all require that static contract at compile time.

For update flows, use a class that exposes:

- `validateUpdate(oldValue, newValue)` returning an `ObjectCheck` or `Promise<ObjectCheck>`
- `updateFrom(existing, input)` returning the updated instance

`ObjectFactory.update(...)`, `ObjectFactory.updateOrThrow(...)`, and `ObjectFactory.updateOrErrors(...)` require that update contract at compile time.

## Create A Validated Object

```ts
import {
  ObjectCheck,
  ObjectFactory,
  required,
  string,
  type,
  validateClass,
} from '@samatawy/checks';

class PersonDto {
  @required()
  @type.string()
  @string.minLength(2)
  name!: string;

  private constructor(private readonly personName: string) {}

  static async validateInput(input: unknown): Promise<ObjectCheck> {
    return validateClass(input, PersonDto);
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

## What The Returned Object Means

The `ObjectFactory<T>` returned by `create(...)` or `update(...)` always contains the validation state.

On success:

- `valid` is `true`
- `instance` contains the hydrated object
- `result(options?)` still works if you want the validation result shape

On failure:

- `valid` is `false`
- `instance` is `undefined`
- `result(options?)` and `check` still expose the validation details

That makes the wrapper useful when callers need both kinds of output.

```ts
const created = await ObjectFactory.create({ name: 'A' }, PersonDto);

console.log(created.valid);
console.log(created.instance);
console.log(created.result({ flattened: true }));
```

If validation fails, `created.instance` stays `undefined`, but `created.result({ flattened: true })` can still return something like:

```json
{
  "valid": false,
  "errors": [
    "Field name must be at least 2 characters long"
  ]
}
```

If validation succeeds, `created.instance` contains the hydrated class instance, and `created.result(...)` reports a valid result tree.

Use `createOrThrow(...)`, `updateOrThrow(...)`, `createOrErrors(...)`, or `updateOrErrors(...)` only when you want those shortcut shapes instead of the full wrapper.

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

## Update A Validated Object

Use `ObjectFactory.update(...)` when validation depends on both the existing instance and the incoming patch.

```ts
class PersonDto {
  static async validateUpdate(existing: PersonDto, input: unknown): Promise<ObjectCheck> {
    return ObjectCheck.for(input)
      .updating(existing)
      .check(root => [
        root.optional('name').string().immutable(),
        root.optional('title').string()
      ]);
  }

  static updateFrom(existing: PersonDto, input: any): PersonDto {
    return new PersonDto(input.name ?? existing.name, input.title ?? existing.title);
  }
}

const existing = new PersonDto('Ada', 'Lead');

const updated = await ObjectFactory.update(existing, { title: 'Architect' }, PersonDto);

if (!updated.valid) {
  console.log(updated.result({ flattened: true }));
} else {
  console.log(updated.instance);
}
```

Update validation should run against the incoming input or patch only. Rules such as `immutable()` and `canUpdate(...)` only evaluate when the current input value is present, so omitted fields stay untouched during patch-style validation.

You can also express custom update rules with `canUpdate(...)`.

```ts
class PersonDto {
  static async validateUpdate(existing: PersonDto, input: unknown): Promise<ObjectCheck> {
    return ObjectCheck.for(input)
      .updating(existing)
      .check(root => [
        root.optional('role').string().canUpdate((oldValue, newValue) => {
          return !(oldValue === 'admin' && newValue !== 'admin');
        }, {
          err: 'Role cannot be downgraded from admin'
        })
      ]);
  }
}
```

## Throw On Invalid Update

If you want the updated instance directly and prefer exceptions for invalid update input, use `ObjectFactory.updateOrThrow(...)`.

```ts
const existing = new PersonDto('Ada', 'Lead');

const updatedPerson = await ObjectFactory.updateOrThrow(existing, { title: 'Architect' }, PersonDto);
```

## Return Update Errors Instead Of Throwing

If you prefer a non-throwing shortcut for updates, use `ObjectFactory.updateOrErrors(...)`.

```ts
const existing = new PersonDto('Ada', 'Lead');

const updated = await ObjectFactory.updateOrErrors(existing, { name: 'Grace' }, PersonDto);

if (updated.errors) {
  console.log(updated.errors);
} else {
  console.log(updated.instance);
}
```

This returns one of these shapes:

- `{ instance }` when update validation succeeds
- `{ errors }` when update validation fails

## Why This Pattern Exists

This pattern works well for classes that need:

- private or protected state
- constructor parameters
- setter-based normalization
- post-validation invariants

Validation stays reusable and generic, while hydration stays inside the class where object construction logic belongs.