---
title: Checks API
group: Reference
category: API
---

# Checks API

This package provides a fluent validation API built around a small set of composable check classes.

Many flows are asynchronous. Any API that evaluates promised checks or loads binary data should be awaited before you build the final result.

If you need stable codes or translated result text, see [coded-results.md](coded-results.md). The main API works fine without that layer.

## Main classes

### `validateClass(...)`

Use `validateClass(input, ClassType, options?)` when a class definition should drive validation directly.

By default, it uses hybrid behavior:

- explicit decorators are applied first
- initialized class fields can still contribute inferred checks when a property has no explicit decorator shape yet

Type-only property declarations such as `name!: string` or `age?: number` do not create runtime instance properties in JavaScript, so inference cannot see them unless decorators registered metadata for them. A default value such as `name = ''` or `active = false` does create a runtime property, which is why inference currently follows initialized fields.

Example:

```ts
import { required, string, type, validateClass } from '@samatawy/checks';

class PersonDto {
  @required()
  @type.string()
  @string.minLength(2)
  name!: string;

  active = false;
}

const check = await validateClass({
  name: 'Ada',
  active: true,
}, PersonDto, {
  noExtraFields: true,
});

const result = check.result({ language: 'en' });
```

Notes:

- pass `{ skip: 'inference' }` for decorator-only behavior
- pass `{ skip: 'decorators' }` for inference-only behavior
- inference only sees properties that exist on a constructed instance at runtime, which in practice means initialized class fields or nested object instances created by those initializers
- nested `matchesType(...)` calls also accept the same options shape

### `ObjectCheck`

Use `ObjectCheck` when the input itself is an object or when a field should contain an object.

Common methods:

- `ObjectCheck.for(data)` starts a root object validation
- `notEmpty(options?)` rejects empty objects
- `object(options?)` asserts the value is an object and not an array
- `required(name, options?)` starts a required field validation
- `optional(name)` starts an optional field validation
- `conditional(name, condition, options?)` requires a field only when the predicate returns `true`
- `noExtraFields(options?)` flags undeclared keys in the final object result
- `check(fn)` applies nested rules and aggregates results asynchronously
- `allOf(fn)` applies a nested group of object rules where all returned checks must pass
- `anyOf(branches)` applies alternative object branches where at least one branch must pass
- `oneOf(branches)` applies alternative object branches where exactly one branch must pass
- `not(fn, options?)` applies a negated object branch that must fail
- `isTrue(fn, options?)` applies a custom object-level predicate and supports async predicates
- `canUpdate(fn, options?)` applies a custom old-value/new-value predicate against the current object value when that value is present in the current input
- `immutable(options?)` rejects changes when `updating(...)` supplied a previously defined object value and the current input also supplies that value
- `result(options?)` returns the current result or a formatted final result depending on the options you pass

Example:

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for(input)
  .notEmpty()
  .check(person => [
    person.required('name').string().minLength(2).maxLength(100),
    person.optional('age').number().atLeast(0).atMost(150),
    person.required('address').object().check(address => [
      address.required('street').string(),
      address.required('city').string()
    ])
  ]);

const result = check.result({ language: 'en' });
```

Composition example:

```ts
import { ObjectCheck } from '@samatawy/checks';

const input = {
  profile: {
    name: '  Ada  ',
    age: '37'
  }
};

const check = await ObjectCheck.for(input)
  .check(root => [
    root.required('profile').object().anyOf([
      profile => [
        profile.required('name').string().trim().minLength(3)
      ],
      profile => [
        profile.required('age').number({ tolerant: true }).greaterThan(17)
      ]
    ])
  ]);

const result = check.result({ language: 'en' });
```

Notes:

- `allOf(fn)` keeps the same callback shape as `check(fn)`
- `anyOf(...)` and `oneOf(...)` accept an array of branch functions, not a single callback
- valid `anyOf(...)` and `oneOf(...)` branches are replayed on the real object, so normal mutations such as `trim()` or tolerant parsing affect the original input consistently
- `not(...)` evaluates its branch on isolated data and never replays mutations onto the original input

Update predicate example:

```ts
import { ObjectCheck } from '@samatawy/checks';

const current = {
  name: 'Ada',
  role: 'editor'
};

const previous = {
  name: 'Ada',
  role: 'admin'
};

const check = await ObjectCheck.for(current)
  .updating(previous)
  .check(root => [
    root.optional('role').string().canUpdate((oldValue, newValue) => {
      return !(oldValue === 'admin' && newValue !== 'admin');
    }, {
      err: 'Role cannot be downgraded from admin'
    })
  ]);

const result = check.result({ flattened: true });
```

### `FieldCheck`

`FieldCheck` bridges from an object field to a specific value type.

Common methods:

- `required(options?)`
- `allOf(fn)` applies a group of field rules where all returned checks must pass
- `anyOf(branches)` applies alternative field branches where at least one branch must pass
- `oneOf(branches)` applies alternative field branches where exactly one branch must pass
- `not(fn, options?)` applies a negated field branch that must fail
- `equals(value, options?)` compares the field value using strict equality by default and supports lax matching with `tolerant: true`
- `canUpdate(fn, options?)` applies a custom old-value/new-value predicate for the field value when that field is present in the current input
- `immutable(options?)` rejects changes when `updating(...)` supplied a previously defined field value and the current input also supplies that field
- `object()`
- `array()`
- `file()`
- `image()`
- `string()`
- `email()`
- `url()`
- `number()`
- `date()`
- `uuid()`
- `ulid()`
- `boolean()`

Notes:

- `file()` returns `Promise<FileCheck>`
- `image()` returns `Promise<ImageCheck>`
- `email()` returns `EmailCheck`
- `url()` returns `UrlCheck`
- `uuid()` returns `UUIDCheck`
- `uuid(options?)` accepts the same UUID version filter supported by `UUIDCheck.version(...)`
- `ulid()` returns `UUIDCheck` in ULID mode
- the other branching methods return synchronous check instances

Field composition example:

```ts
import { ObjectCheck } from '@samatawy/checks';

const input = {
  value: '37'
};

const check = await ObjectCheck.for(input)
  .check(root => [
    root.required('value').anyOf([
      field => [field.number({ tolerant: true }).greaterThan(10)],
      field => [field.string().minLength(5)]
    ])
  ]);

const result = check.result({ language: 'en' });
```

### `ArrayCheck`

Use `ArrayCheck` for array-specific validation.

Common methods:

- `ArrayCheck.for(data)` starts a root array validation
- `array(options?)` ensures the value is an array
- `notEmpty(options?)` rejects empty arrays
- `minLength(length, options?)`
- `maxLength(length, options?)`
- `noDuplicates(key?, options?)` rejects duplicate primitive values, duplicate repeated object references, or duplicate object values by a selected object key
- `matchesType(ClassType, options?)` validates each array element against one decorated class definition
- `check(fn)` applies array-level checks and synthetic child results asynchronously
- `allOf(fn)` applies a group of array rules where all returned checks must pass
- `anyOf(branches)` applies alternative array branches where at least one branch must pass
- `oneOf(branches)` applies alternative array branches where exactly one branch must pass
- `not(fn, options?)` applies a negated array branch that must fail
- `checkEach(fn)` validates each item using `ArrayItemCheck` and supports promised checks
- `contains(fn, options?)` succeeds when a bounded number of items match one nested item rule without reporting non-matching item errors individually
- `isTrue(fn, options?)` applies a custom predicate to the array value and supports async predicates
- `canUpdate(fn, options?)` applies a custom old-value/new-value predicate against the current array value when that value is present in the current input
- `canAdd(fn, options?)` applies a predicate to each item added by the current array update
- `canDelete(fn, options?)` applies a predicate to each item removed by the current array update
- `immutable(options?)` rejects changes when `updating(...)` supplied a previously defined array value and the current input also supplies that value
- `isTrueEach(fn, options?)` runs a custom predicate on every item and supports async predicates
- `result(options?)` returns the current result or a formatted final result depending on the options you pass

Example:

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for(input)
  .check(person => [
    person.optional('children').array().maxLength(10)
      .checkEach(child => [
        child.object(),
        child.required('name').string(),
        child.optional('age').number().atLeast(0).atMost(17)
      ])
  ]);

const result = check.result({ flattened: true, language: 'en' });
```

Composition example:

```ts
import { ObjectCheck } from '@samatawy/checks';

const input = {
  tags: ['  Ada  ', '  Bob  ']
};

const check = await ObjectCheck.for(input)
  .check(root => [
    root.required('tags').array().anyOf([
      tags => [
        tags.checkEach(item => [item.string().trim().minLength(2)])
      ],
      tags => [tags.maxLength(1)]
    ])
  ]);

const result = check.result({ language: 'en' });
```

Notes:

- `contains(...)` is the array-level “some items must match” helper; use it instead of `checkEach(...)` when non-matching items are expected and should not each produce their own error
- `matchesType(...)` on `ArrayCheck` is shorthand for `checkEach(item => [item.matchesType(...)])`
- `item.array().matchesType(...)` refers to a nested-array case where the current item value is itself an array and each nested element must match the class definition
- `canAdd(...)` compares the current array value against the previous array from `updating(...)` and runs once for each added item
- `canDelete(...)` compares the current array value against the previous array from `updating(...)` and runs once for each deleted item
- `immutable(...)` only checks values that are present in the current input; omitted fields in patch-style updates are ignored, and initial set is still allowed when no previous value was supplied through `updating(...)`

Array update example:

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({ tags: ['admin', 'editor'] })
  .updating({ tags: ['editor', 'viewer'] })
  .check(root => [
    root.required('tags').array()
      .canAdd((array, item) => item !== 'admin', {
        err: 'Admin tag cannot be added'
      })
      .then(tags => tags.canDelete((array, item) => item !== 'viewer', {
        err: 'Viewer tag cannot be removed'
      }))
  ]);

const result = check.result({ flattened: true });
```

### `ArrayItemCheck`

Represents one element in an array.

Common methods:

- `object()`
- `required(name, options?)`
- `optional(name)`
- `conditional(name, condition, options?)`
- `array()`
- `string()`
- `number()`
- `date()`
- `boolean()`
- `allOf(fn)` applies a group of item rules where all returned checks must pass
- `anyOf(branches)` applies alternative item branches where at least one branch must pass
- `oneOf(branches)` applies alternative item branches where exactly one branch must pass
- `not(fn, options?)` applies a negated item branch that must fail
- `equals(value, options?)` compares the current item value using strict equality by default and supports lax matching with `tolerant: true`
- `canUpdate(fn, options?)` applies a custom old-value/new-value predicate for the current item value when that item is present in the current input
- `immutable(options?)` rejects changes when `updating(...)` supplied a previously defined item value and the current input also supplies that item

Item composition example:

```ts
import { ObjectCheck } from '@samatawy/checks';

const input = {
  values: ['  Ada  ']
};

const check = await ObjectCheck.for(input)
  .check(root => [
    root.required('values').array().checkEach(item => [
      item.anyOf([
        entry => [entry.string().trim().minLength(2)],
        entry => [entry.number().greaterThan(10)]
      ])
    ])
  ]);

const result = check.result({ language: 'en' });
```

### `FileCheck`

Use `FileCheck` for binary or data-URL style inputs.

Creation:

- `await FileCheck.for(key, data)`
- `await field.file()`

Methods:

- `mimeType(expectedMime, options?)`
- `notEmpty(options?)`
- `minSize(minBytes, options?)`
- `maxSize(maxBytes, options?)`

Supported inputs include `Blob`, `File`, `Uint8Array`, `ArrayBuffer`, Node `Buffer`, and `data:` URLs.

### `ImageCheck`

`ImageCheck` extends `FileCheck` with image-specific validation.

Creation:

- `await ImageCheck.for(key, data)`
- `await field.image()`

Methods:

- `isImage(options?)`
- `minWidth(minWidth, options?)`
- `minHeight(minHeight, options?)`
- `maxWidth(maxWidth, options?)`
- `maxHeight(maxHeight, options?)`

### Primitive check classes

`StringCheck`, `EmailCheck`, and `UrlCheck` share common string comparison methods through the internal `StringBaseCheck`.

`NumberCheck` and `DateCheck` expose numeric and date comparison helpers. `ValueCheck` is the shared base for value-level fluent behavior and is usually not needed directly in application code.

Composition helpers such as `allOf(...)`, `anyOf(...)`, `oneOf(...)`, and `not(...)` are intentionally documented on `ObjectCheck`, `FieldCheck`, `ArrayCheck`, and `ArrayItemCheck`, where branching still happens before a final fixed type is chosen.

Selected methods:

- `StringCheck.trim()`
- `StringCheck.minLength(length, options?)`
- `StringCheck.maxLength(length, options?)`
- `StringCheck.equals(value, options?)`
- `StringCheck.equalsOneOf(values, options?)`
- `StringCheck.startsWith(prefix, options?)`
- `StringCheck.endsWith(suffix, options?)`
- `StringCheck.contains(substring, options?)`
- `StringCheck.pattern(regex, options?)`
- `StringCheck.uuid(options?)`
- `StringCheck.ulid(options?)`
- `StringCheck.email(options?)`
- `StringCheck.url(options?)`
- `StringCheck.isBase64(options?)`
- `StringCheck.isSHA256(options?)`
- `StringCheck.isMD5(options?)`
- `StringCheck.isHexadecimal(options?)`
- `StringCheck.isAlphanumeric(options?)`
- `StringCheck.isAscii(options?)`
- `StringCheck.hasMultibyte(options?)`
- `StringCheck.hasUpperCase(minCount?, options?)`
- `StringCheck.hasLowerCase(minCount?, options?)`
- `StringCheck.hasDigit(minCount?, options?)`
- `StringCheck.hasSpecialCharacter(minCount?, options?)`
- `StringCheck.noSpecialCharacters(chars?, options?)`
- `StringCheck.noSpaces(options?)`
- `StringCheck.maxWords(count, options?)`
- `UUIDCheck.version(version, options?)`
- `UUIDCheck.isULID(options?)`
- `NumberCheck.integer(options?)`
- `NumberCheck.greaterThan(value, options?)`
- `NumberCheck.atLeast(value, options?)`
- `NumberCheck.atMost(value, options?)`
- `DateCheck.after(value, options?)`
- `DateCheck.before(value, options?)`
- `DateCheck.sameDay(value, options?)`
- `ValueCheck.isTrue(fn, options?)`
- `ValueCheck.result(options?)`

`uuid()` validates immediately as soon as you enter the UUID checker, like `email()` and `url()`. Use `field.uuid({ version })` or `string().uuid({ version })` when you want the shortcut form, or `uuid().version(4)` / `uuid().version([4, 7])` when you want to narrow an already-valid UUID to one version or a small allowed set.

Use `ulid()` when the value must be a ULID. Like `uuid()`, it validates immediately when you enter the specialized checker, so `field.ulid()` and `string().ulid()` already perform the base ULID validity check.

## Getting results

`result(options?)` is the main output API.

For object and array checks:

- `result({ language })` returns the merged nested result tree
- `result({ language, catalog })` resolves coded messages with an explicit result catalog instead of `ResultCatalog.global`
- `result({ flattened: true, language })` returns flattened `hints`, `warnings`, and `errors`
- `result({ nested: true, language })` returns an input-shaped projection under `input`
- `result({ validated: 'partial', language })` returns a cloned validated value with invalid descendants removed and valid siblings preserved
- `result({ validated: 'strict', language })` returns a cloned validated value where any invalid descendant removes the whole parent branch
- `result({ raw: true, nested: true, flattened: true, language })` returns all projections at once

For value-level checks:

- `result({ language })` returns the finalized single result
- `result()` returns the current single result state without extra projections

Example:

```ts
const output = check.result({
  raw: true,
  nested: true,
  validated: 'partial',
  flattened: true,
  language: 'en'
}) as any;

console.log(output.raw);
console.log(output.input);
console.log(output.validated);
console.log(output.errors);
```

Notes:

- `catalog` lets final result formatting resolve coded messages from a specific `ResultCatalog`; without it, the package uses `ResultCatalog.global`
- `validated` uses the current normalized input value, so coercions or mutations performed by checks are reflected in the output
- `'partial'` is the default mode to prefer when you want to keep valid object fields or array items even if siblings fail
- `'strict'` is useful when a parent object or array should be considered unusable as soon as one descendant is invalid

## Result types

### `SingleResult`

Represents one validation outcome.

```ts
interface SingleResult {
  valid: boolean;
  field?: string | number | null | undefined;
  hint?: string | string[];
  warn?: string | string[];
  err?: string | string[];
  code?: string | number;
}
```

### `ResultSet`

Adds nested and flattened result collections.

```ts
interface ResultSet extends SingleResult {
  input?: any;
  results?: IResult[];
  hints?: string[];
  warnings?: string[];
  errors?: string[];
}
```

## Options

### `CheckOptions`

Use these to customize output when a check fails.

```ts
interface CheckOptions {
  hint?: string | string[];
  warn?: string | string[];
  err?: string | string[];
  code?: string | number;
  catalog?: IResultCatalog;
}
```

Use inline `hint`, `warn`, or `err` for direct messages.

Use `code` when you want the message level and translations to come from a `ResultCatalog`. If you do not pass `catalog`, the package uses `ResultCatalog.global`.

### `StringCheckOptions`

Adds case sensitivity control.

```ts
interface StringCheckOptions extends CheckOptions {
  case?: 'sensitive' | 'insensitive';
}
```

### `ResultOptions`

Controls how final output is shaped.

```ts
interface ResultOptions {
  language?: string;
  catalog?: IResultCatalog;
  raw?: boolean;
  nested?: boolean;
  validated?: 'partial' | 'strict';
  flattened?: boolean;
}
```

### `ClassValidationOptions`

Controls how `validateClass(...)` and `matchesType(...)` source their rules.

```ts
interface ClassValidationOptions {
  noExtraFields?: boolean;
  noExtraFieldsOptions?: CheckOptions;
  result?: ResultOptions;
  skip?: 'decorators' | 'inference';
}
```

Notes:

- omit `skip` to use hybrid behavior
- use `skip: 'inference'` to require explicit decorators only
- use `skip: 'decorators'` to ignore decorator metadata and rely on inferred checks from runtime instance properties, which usually means initialized class fields

## Installation notes

Install just the core package if you only need object, array, string, number, or date validation:

```bash
npm install @samatawy/checks
```

Install the optional peer dependencies when using file or image validation:

```bash
npm install @samatawy/checks file-type probe-image-size
```
