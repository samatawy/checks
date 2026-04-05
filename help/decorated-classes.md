---
title: Decorated Classes
group: Guides
category: Decorators
---

# Decorated Classes

This guide covers the decorator-based validation API.

Use this approach when you want validation rules to live next to DTO-like classes instead of building every rule inline with fluent `ObjectCheck` calls.

## What The Decorator API Exports

The package root exports the decorator API directly:

- `required()` and `optional()` for property presence
- `matchesType(ClassType, options?)` for applying a decorated class to an object property
- `type.*()` for property type entry points
- `items.*()` for array item type entry points
- grouped rule decorators such as `object`, `string`, `number`, `boolean`, `date`, `uuid`, `ulid`, `email`, `url`, `file`, `image`, `array`, and `item`
- `validateClass(input, ClassType, options?)` for validating a plain input object against a class using decorators, inferred defaults, or both

## Validate A Class Directly

Use `validateClass(...)` when the class is the main validation definition. By default it uses hybrid mode: explicit decorators first, then inferred checks from initialized class fields that still have no explicit rules.

```ts
import {
  boolean,
  required,
  type,
  string,
  number,
  validateClass,
} from '@samatawy/checks';

class PersonDto {
  @required()
  @type.string()
  @string.minLength(2)
  @string.maxLength(50)
  name!: string;

  @type.number()
  @number.atLeast(0)
  @number.atMost(130)
  age!: number;

  @type.boolean()
  @boolean.equals(true)
  active!: boolean;
}

const check = await validateClass({
  name: 'Ada',
  age: 37,
  active: true,
}, PersonDto, {
  noExtraFields: true,
});

const result = check.result({ language: 'en' });
console.log(result.valid);
console.log(result.results);
```

If you want strict decorator-only behavior, pass `{ skip: 'inference' }`. If you want loose inference-only behavior, pass `{ skip: 'decorators' }`.

## Validate A Class Through ObjectCheck

Use `matchesType(...)` when you want to combine class validation with the existing fluent object API.

```ts
import {
  ObjectCheck,
  required,
  type,
  string,
} from '@samatawy/checks';

class PersonDto {
  @required()
  @type.string()
  @string.minLength(2)
  name!: string;
}

const check = await ObjectCheck.for({
  name: 'Ada',
}).matchesType(PersonDto, {
  noExtraFields: true,
});

const result = check.result({ nested: true, language: 'en' });
console.log(result);
```

This is useful when you want a class definition to drive the main shape, but still want to add extra fluent rules before returning the result.

```ts
const check = await ObjectCheck.for(payload)
  .notEmpty()
  .matchesType(PersonDto, { noExtraFields: true });
```

## Validate A Nested Field With A Class Definition

Use `field.matchesType(...)` when a field itself should be validated against a class definition.

```ts
import {
  ObjectCheck,
  required,
  type,
  string,
} from '@samatawy/checks';

class AddressDto {
  @required()
  @type.string()
  @string.minLength(2)
  city!: string;
}

const check = await ObjectCheck.for({
  address: { city: 'Cairo' },
}).check(person => [
  person.required('address').matchesType(AddressDto, {
    noExtraFields: true,
  }),
]);

const result = check.result({ nested: true, language: 'en' });
console.log(result);
```

When the field belongs to another decorated class, use `@matchesType(...)` or `@type.object()` with `@object.matchesType(...)`. The nested class can still define its own field rules, and both forms accept optional nested `validateClass(...)` options such as `{ noExtraFields: true }`.

```ts
import {
  matchesType,
  object,
  optional,
  required,
  type,
  string,
  validateClass,
} from '@samatawy/checks';

class AddressDto {
  @required()
  @type.string()
  @string.minLength(2)
  city!: string;

  @required()
  @type.string()
  @string.minLength(2)
  street!: string;

  @optional()
  @type.string()
  @string.maxLength(10)
  unit?: string;
}

class PersonDto {
  @required()
  @type.string()
  @string.minLength(2)
  name!: string;

  @required()
  @matchesType(AddressDto, { noExtraFields: true })
  address!: AddressDto;
}

const check = await validateClass({
  name: 'Ada',
  address: {
    city: 'Cairo',
    street: 'Nile Street',
    unit: '12B',
  },
}, PersonDto, {
  noExtraFields: true,
});

console.log(check.result({ nested: true, language: 'en' }));
```

That is the decorator equivalent of saying “this field must be an object that matches this decorated structure”.

If you only need object-level rules without another decorated class, use `@type.object()` with `@object.*()`.

```ts
import { object, required, type, validateClass } from '@samatawy/checks';

class PayloadDto {
  @required()
  @type.object()
  @object.notEmpty()
  metadata!: Record<string, unknown>;
}

const check = await validateClass({
  metadata: {},
}, PayloadDto);

console.log(check.result({ nested: true, language: 'en' }));
```

## Validate A Nested Object With Inline Field Rules

If you do not want a separate class definition, use the fluent object API on the field itself.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  address: {
    city: 'Cairo',
    street: 'Nile Street',
  },
}).check(person => [
  person.required('address').object().check(address => [
    address.required('city').string().minLength(2),
    address.required('street').string().minLength(2),
    address.optional('unit').string().maxLength(10),
  ]),
]);

console.log(check.result({ nested: true, language: 'en' }));
```

Use this style when the nested object rules are local to one workflow and do not need a reusable decorated class.

## How Object Decorators Work

Object validation has an explicit type entry point: `@type.object()`.

Use it when a property must be treated as an object before additional object-specific rules are applied.

In practice, object validation usually looks like one of these:

- `@matchesType(ClassType, options?)` when the whole property should follow another decorated class
- `@type.object()` with `@object.matchesType(ClassType, options?)` when you want the object intent and the nested class rule to be explicit together
- `@type.object()` with `@object.notEmpty()` or `@object.noExtraFields()` when you want object-level rules without another decorated class
- `field.object().check(...)` when the nested rules are local and you do not want a reusable class definition

So `@type.object()` is the object type entry point, while `@matchesType(...)` and `@object.*()` describe what that object must satisfy.

Further checks such as typed field rules inside that object still use the fluent API.

## Validate Array Items With A Class Definition

Use `ArrayCheck.matchesType(...)`, `item.matchesType(...)`, or array decorators when each element in an array should follow the same class definition.

For the normal `ChildDto[]` case, prefer `ArrayCheck.matchesType(...)`, `@array.matchesType(...)`, or the explicit `@items.object()` with `@item.object.matchesType(...)` form.

`item.array.matchesType(...)` is narrower: it is only for nested arrays where one item inside the outer array is itself another array, and each element inside that inner array must match the class definition.

```ts
import {
  ArrayCheck,
  required,
  type,
  string,
} from '@samatawy/checks';

class ChildDto {
  @required()
  @type.string()
  @string.minLength(1)
  name!: string;
}

const check = await ArrayCheck.for([
  { name: 'A' },
  { name: 'B' },
]).matchesType(ChildDto);

const result = check.result({ raw: true, flattened: true, language: 'en' }) as any;
console.log(result.raw.results);
```

For an array property inside a decorated class, use `@array.matchesType(...)` as the shortest form, or `@items.object()` with `@item.object.matchesType(...)` when you want the item entry point to stay explicit.

```ts
import {
  array,
  items,
  item,
  required,
  type,
  string,
  validateClass,
} from '@samatawy/checks';

class ChildDto {
  @required()
  @type.string()
  @string.minLength(1)
  name!: string;
}

class FamilyDto {
  @required()
  @type.array()
  @array.minLength(1)
  @array.matchesType(ChildDto, { noExtraFields: true })
  children!: ChildDto[];
}

const check = await validateClass({
  children: [
    { name: 'A' },
    { name: 'B' },
  ],
}, FamilyDto, {
  noExtraFields: true,
});

console.log(check.result({ nested: true, language: 'en' }));
```

The explicit item form still works and is equivalent when you prefer to show the array item shape directly:

```ts
class FamilyDto {
  @required()
  @type.array()
  @array.minLength(1)
  @items.object()
  @item.object.matchesType(ChildDto, { noExtraFields: true })
  children!: ChildDto[];
}
```

If you are validating nested arrays such as `ChildDto[][]`, that is the case where `@item.array.matchesType(...)` becomes meaningful: the outer property is an array, each item is another array, and each element inside that inner array must match the decorated class.

## Use Decorators For Array Item Rules

The decorator API also supports array-level rules and array-item rules inside a decorated class.

```ts
import {
  required,
  type,
  array,
  items,
  item,
  validateClass,
} from '@samatawy/checks';

class PersonDto {
  @required()
  @type.array()
  @array.minLength(1)
  @items.string()
  @item.string.minLength(2)
  tags!: string[];
}

const check = await validateClass({
  tags: ['alpha', 'beta'],
}, PersonDto);

console.log(check.result({ language: 'en' }));
```

If the array only needs some bounded number of matching items instead of validating every item, use `@array.contains(...)` together with the same `@items.*()` and `@item.*()` decorators.

```ts
import {
  array,
  item,
  items,
  required,
  type,
  validateClass,
} from '@samatawy/checks';

class PersonDto {
  @required()
  @type.array()
  @array.contains({ minCount: 1, maxCount: 2 })
  @items.string()
  @item.string.trim()
  @item.string.minLength(2)
  tags!: string[];
}

const check = await validateClass({
  tags: [' x ', '  Ada  '],
}, PersonDto);

console.log(check.result({ language: 'en' }));
```

In that form, the item decorators describe the matching item shape, and `@array.contains(...)` decides how many items must satisfy it.

## Use Specialized Decorator Groups

Specialized validators work the same way as the fluent API. Pick the correct `type.*()` entry point and then apply the matching decorator group.

UUID and ULID example:

```ts
import { type, uuid, ulid, validateClass } from '@samatawy/checks';

class IdentifiersDto {
  @type.uuid()
  @uuid.version(4)
  id!: string;

  @type.ulid()
  @ulid.isULID()
  traceId!: string;
}
```

`@type.uuid()` and `@type.ulid()` validate immediately when you enter those specialized checkers, so the grouped decorators only add extra constraints such as UUID version filtering.

Email example:

```ts
import { type, email, validateClass } from '@samatawy/checks';

class AccountDto {
  @type.email()
  @email.host(['example.com'])
  emailAddress!: string;
}

const check = await validateClass({
  emailAddress: 'user@example.com',
}, AccountDto);
```

File example:

```ts
import { type, file, validateClass } from '@samatawy/checks';

class UploadDto {
  @type.file()
  @file.notEmpty()
  @file.maxSize(1024 * 1024)
  document!: Uint8Array;
}

const check = await validateClass({
  document: uploadedBuffer,
}, UploadDto);
```

Image example:

```ts
import { type, image, validateClass } from '@samatawy/checks';

class AvatarDto {
  @type.image()
  @image.isImage()
  @image.minWidth(200)
  @image.minHeight(200)
  avatar!: Uint8Array;
}

const check = await validateClass({
  avatar: uploadedBuffer,
}, AvatarDto);
```

## When To Use Decorators Versus Fluent Rules

Decorator-based validation works well when:

- you already have DTO classes that define request or payload shapes
- you want the validation definition to live next to those classes
- the same class-based rule set is reused across multiple call sites

The fluent API is usually simpler when:

- the validation is local to one workflow
- the rule logic is highly dynamic
- the validation shape depends heavily on runtime conditions

You can mix both styles. `ObjectCheck.matchesType(...)` and `field.matchesType(...)` are specifically designed for that.

## Create Typed Instances With `ObjectFactory`

If you want validation and object creation together, see [object-factory.md](object-factory.md).

That guide covers the required static methods, `ObjectFactory.create(...)`, `ObjectFactory.createOrThrow(...)`, and `ObjectFactory.createOrErrors(...)`.