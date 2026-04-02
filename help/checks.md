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
- `isTrue(fn, options?)` applies a custom object-level predicate and supports async predicates
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

### `FieldCheck`

`FieldCheck` bridges from an object field to a specific value type.

Common methods:

- `required(options?)`
- `object()`
- `array()`
- `file()`
- `image()`
- `string()`
- `email()`
- `url()`
- `number()`
- `date()`
- `boolean()`

Notes:

- `file()` returns `Promise<FileCheck>`
- `image()` returns `Promise<ImageCheck>`
- `email()` returns `EmailCheck`
- `url()` returns `UrlCheck`
- the other branching methods return synchronous check instances

### `ArrayCheck`

Use `ArrayCheck` for array-specific validation.

Common methods:

- `ArrayCheck.for(data)` starts a root array validation
- `array(options?)` ensures the value is an array
- `notEmpty(options?)` rejects empty arrays
- `minLength(length, options?)`
- `maxLength(length, options?)`
- `noDuplicates(key?, options?)` rejects duplicate primitive values, duplicate repeated object references, or duplicate object values by a selected object key
- `check(fn)` applies array-level checks and synthetic child results asynchronously
- `checkEach(fn)` validates each item using `ArrayItemCheck` and supports promised checks
- `isTrue(fn, options?)` applies a custom predicate to the array value and supports async predicates
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

Selected methods:

- `StringCheck.trim()`
- `StringCheck.minLength(length, options?)`
- `StringCheck.maxLength(length, options?)`
- `StringCheck.oneOf(values, options?)`
- `StringCheck.pattern(regex, options?)`
- `StringCheck.email(options?)`
- `StringCheck.url(options?)`
- `NumberCheck.integer(options?)`
- `NumberCheck.greaterThan(value, options?)`
- `NumberCheck.atLeast(value, options?)`
- `NumberCheck.atMost(value, options?)`
- `DateCheck.after(value, options?)`
- `DateCheck.before(value, options?)`
- `DateCheck.sameDay(value, options?)`
- `ValueCheck.isTrue(fn, options?)`
- `ValueCheck.result(options?)`

## Getting results

`result(options?)` is the main output API.

For object and array checks:

- `result({ language })` returns the merged nested result tree
- `result({ flattened: true, language })` returns flattened `hints`, `warnings`, and `errors`
- `result({ nested: true, language })` returns an input-shaped projection under `input`
- `result({ raw: true, nested: true, flattened: true, language })` returns all projections at once

For value-level checks:

- `result({ language })` returns the finalized single result
- `result()` returns the current single result state without extra projections

Example:

```ts
const output = check.result({
  raw: true,
  nested: true,
  flattened: true,
  language: 'en'
}) as any;

console.log(output.raw);
console.log(output.input);
console.log(output.errors);
```

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
  flattened?: boolean;
}
```

## Installation notes

Install just the core package if you only need object, array, string, number, or date validation:

```bash
npm install @samatawy/checks
```

Install the optional peer dependencies when using file or image validation:

```bash
npm install @samatawy/checks file-type probe-image-size
```
