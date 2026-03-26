# Checks API

This package provides a fluent validation API built around a small set of composable check classes.

Many flows are now asynchronous. Any API that evaluates promised checks or loads binary data should be awaited before calling `collect()`.

## Main classes

### `ObjectCheck`

Use `ObjectCheck` when the input itself is an object or when a field should contain an object.

Common methods:

- `ObjectCheck.for(data)` starts a root object validation
- `notEmpty()` rejects empty objects
- `required(name)` starts a required field validation
- `optional(name)` starts an optional field validation
- `check(fn)` applies nested rules and aggregates results asynchronously
- `rules(checks)` evaluates a prebuilt array of checks or promised checks asynchronously
- `is_true(fn, options)` applies a custom object-level predicate and supports async predicates
- `result()` returns nested results as collected so far
- `collect()` flattens nested results into `hints`, `warnings`, and `errors`

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

const result = check.collect();
```

### `FieldCheck`

`FieldCheck` is the bridge from an object field to a specific value type.

Common methods:

- `required()`
- `object()`
- `array()`
- `file()`
- `image()`
- `string()`
- `number()`
- `date()`
- `boolean()`

Notes:

- `file()` returns `Promise<FileCheck>`
- `image()` returns `Promise<ImageCheck>`
- the other branching methods return synchronous check instances

### `ArrayCheck`

Use `ArrayCheck` for array-specific validation.

Common methods:

- `ArrayCheck.for(data)` starts a root array validation
- `array()` ensures the value is an array
- `notEmpty()` rejects empty arrays
- `minLength(length)`
- `maxLength(length)`
- `rules_each(checks)` evaluates prebuilt child checks asynchronously
- `check_each(fn)` validates each item using `ArrayItemCheck` and supports promised checks
- `is_true(fn, options)` applies a custom predicate to the array value and supports async predicates
- `is_true_each(fn, options)` runs a custom predicate on every item and supports async predicates

Example:

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for(input)
  .check(person => [
    person.optional('children').array().maxLength(10)
      .check_each(child => [
        child.object(),
        child.required('name').string(),
        child.optional('age').number().atLeast(0).atMost(17)
      ])
  ]);

const result = check.collect();
```

### `ArrayItemCheck`

Represents one element in an array. It can branch back into `object()`, `array()`, `string()`, `number()`, `date()`, and `boolean()` checks, and it also supports `required(name)` and `optional(name)` for object-like array items.

### `FileCheck`

Use `FileCheck` for binary or data-URL style inputs.

Dependency note:

- install `file-type` when you use file validation features
- in most projects that also use image validation, install `probe-image-size` as well

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

Dependency note:

- `probe-image-size` is used in Node runtimes
- browser runtimes can use `createImageBitmap` when available
- for cross-platform projects, install both `file-type` and `probe-image-size`

Creation:

- `await ImageCheck.for(key, data)`
- `await field.image()`

Methods:

- `isImage(options?)`
- `minWidth(minWidth, options?)`
- `minHeight(minHeight, options?)`
- `maxWidth(maxWidth, options?)`
- `maxHeight(maxHeight, options?)`

Example:

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for(input).check(person => [
  person.optional('photo').image().then(photo =>
    photo.isImage()
      .minWidth(200)
      .minHeight(200)
      .maxWidth(2000)
      .maxHeight(2000)
  )
]);

const result = check.collect();
```

## Installation Notes

Install just the core package if you only need object, array, string, number, or date validation:

```bash
npm install @samatawy/checks
```

Install the optional peer dependencies when using file or image validation:

```bash
npm install @samatawy/checks file-type probe-image-size
```

## Primitive check classes

### `StringCheck`

Methods:

- `minLength(length, options?)`
- `maxLength(length, options?)`
- `oneOf(values, options?)`
- `startsWith(prefix, options?)`
- `endsWith(suffix, options?)`
- `contains(substring, options?)`
- `pattern(regex, options?)`

### `NumberCheck`

Methods:

- `greaterThan(value, options?)`
- `lessThan(value, options?)`
- `atLeast(value, options?)`
- `atMost(value, options?)`

The comparison value can be a number or the name of another numeric field.

### `DateCheck`

Methods:

- `after(value, options?)`
- `before(value, options?)`
- `sameDay(value, options?)`
- `sameMonth(value, options?)`
- `sameYear(value, options?)`
- `withinMinutes(value, expectedDifference, options?)`
- `withinHours(value, expectedDifference, options?)`
- `withinDays(value, expectedDifference, options?)`
- `withinMonths(value, expectedDifference, options?)`

The comparison value can be a `Date`, timestamp-like number, string, or the name of another date field.

### `ValueCheck`

Base class shared by the specific value validators.

Common inherited methods:

- `inherit(priors)`
- `is_true(fn, options?)` supports sync and async predicates
- `result()`

## Result types

### `SingleResult`

Represents one validation outcome.

```ts
interface SingleResult {
  valid: boolean;
  field?: string | number | null | undefined;
  hint?: string | string[];
  warn?: string | string[];
  err?: string;
}
```

### `ResultSet`

Adds nested and flattened result collections.

```ts
interface ResultSet extends SingleResult {
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
{
  hint?: string | string[];
  warn?: string | string[];
  err?: string;
}
```

### `StringCheckOptions`

Adds case sensitivity control.

```ts
{
  case?: 'sensitive' | 'insensitive';
}
```

## Helpers

### `defined(value)`

Type guard that narrows away `null` and `undefined`.

```ts
import { defined } from '@samatawy/checks';

const value: string | null | undefined = source.name;

if (defined(value)) {
  value.toUpperCase();
}
```

### `buildErrorMessage(err, options)`

Creates a `SingleResult` payload using the same rules as the check classes.

### `appendError(result, err, options)`

Appends error, hint, and warning information onto an existing result object.

### `collectResults(resultSet)`

Merges duplicate field entries and computes flattened `hints`, `warnings`, and `errors` arrays.

### `isPromise(value)`

Promise-like guard used internally when a check list contains a mix of synchronous checks and promised checks.