# Decorated Classes

This guide covers the decorator-based validation API.

Use this approach when you want validation rules to live next to DTO-like classes instead of building every rule inline with fluent `ObjectCheck` calls.

## What The Decorator API Exports

The package root exports the decorator API directly:

- `required()` and `optional()` for property presence
- `nested(ClassType)` for nested decorated objects
- `type.*()` for property type entry points
- `items.*()` for array item type entry points
- grouped rule decorators such as `string`, `number`, `date`, `email`, `url`, `file`, `image`, `array`, and `item`
- `validateDecoratedClass(input, ClassType)` for validating a plain input object against a decorated class

## Validate A Decorated Class Directly

Use `validateDecoratedClass(...)` when the decorated class is the main validation definition.

```ts
import {
  required,
  type,
  string,
  number,
  validateDecoratedClass,
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
}

const check = await validateDecoratedClass({
  name: 'Ada',
  age: 37,
}, PersonDto, {
  noExtraFields: true,
});

const result = check.result({ language: 'en' });
console.log(result.valid);
console.log(result.results);
```

## Validate A Decorated Class Through ObjectCheck

Use `decorated(...)` when you want to combine decorated-class validation with the existing fluent object API.

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
}).decorated(PersonDto, {
  noExtraFields: true,
});

const result = check.result({ nested: true, language: 'en' });
console.log(result);
```

This is useful when you want a decorated class to define the main shape, but still want to add extra fluent rules before returning the result.

```ts
const check = await ObjectCheck.for(payload)
  .notEmpty()
  .decorated(PersonDto, { noExtraFields: true });
```

## Validate A Nested Field With A Decorated Class

Use `field.decorated(...)` when a field itself should be validated against a decorated class.

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
  person.required('address').decorated(AddressDto, {
    noExtraFields: true,
  }),
]);

const result = check.result({ nested: true, language: 'en' });
console.log(result);
```

When the field belongs to another decorated class, use `nested(...)` on the property itself. The nested class can still define its own field rules.

```ts
import {
  nested,
  optional,
  required,
  type,
  string,
  validateDecoratedClass,
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
  @nested(AddressDto)
  address!: AddressDto;
}

const check = await validateDecoratedClass({
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

## Validate A Nested Object With Inline Field Rules

If you do not want a separate decorated class, use the fluent object API on the field itself.

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

## Why There Is No `object()` Decorator

There is no standalone `object()` decorator because a plain object usually needs more than a type check. In practice, object validation means one of these:

- the field must match another decorated class, which is what `nested(ClassType)` expresses
- the field must be checked inline with explicit nested field rules, which is what `field.object().check(...)` does

So the API models object fields through structure-aware entry points instead of a bare `@type.object()` decorator that would only say “this is an object” without describing the shape.

## Validate Array Items With A Decorated Class

Use `item.decorated(...)` or array decorators when each element in an array should follow the same decorated definition.

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
]).checkEach(item => [
  item.decorated(ChildDto),
]);

const result = check.result({ raw: true, flattened: true, language: 'en' }) as any;
console.log(result.raw.results);
```

For an array property inside a decorated class, use `@items.nested(...)` when each element should match another decorated class.

```ts
import {
  array,
  items,
  nested,
  required,
  type,
  string,
  validateDecoratedClass,
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
  @items.nested(ChildDto)
  children!: ChildDto[];
}

const check = await validateDecoratedClass({
  children: [
    { name: 'A' },
    { name: 'B' },
  ],
}, FamilyDto, {
  noExtraFields: true,
});

console.log(check.result({ nested: true, language: 'en' }));
```

## Use Decorators For Array Item Rules

The decorator API also supports array-level rules and array-item rules inside a decorated class.

```ts
import {
  required,
  type,
  array,
  items,
  item,
  validateDecoratedClass,
} from '@samatawy/checks';

class PersonDto {
  @required()
  @type.array()
  @array.minLength(1)
  @items.string()
  @item.string.minLength(2)
  tags!: string[];
}

const check = await validateDecoratedClass({
  tags: ['alpha', 'beta'],
}, PersonDto);

console.log(check.result({ language: 'en' }));
```

## Use Specialized Decorator Groups

Specialized validators work the same way as the fluent API. Pick the correct `type.*()` entry point and then apply the matching decorator group.

Email example:

```ts
import { type, email, validateDecoratedClass } from '@samatawy/checks';

class AccountDto {
  @type.email()
  @email.host(['example.com'])
  emailAddress!: string;
}

const check = await validateDecoratedClass({
  emailAddress: 'user@example.com',
}, AccountDto);
```

File example:

```ts
import { type, file, validateDecoratedClass } from '@samatawy/checks';

class UploadDto {
  @type.file()
  @file.notEmpty()
  @file.maxSize(1024 * 1024)
  document!: Uint8Array;
}

const check = await validateDecoratedClass({
  document: uploadedBuffer,
}, UploadDto);
```

Image example:

```ts
import { type, image, validateDecoratedClass } from '@samatawy/checks';

class AvatarDto {
  @type.image()
  @image.isImage()
  @image.minWidth(200)
  @image.minHeight(200)
  avatar!: Uint8Array;
}

const check = await validateDecoratedClass({
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

You can mix both styles. `ObjectCheck.decorated(...)` and `field.decorated(...)` are specifically designed for that.