# Checks API

This package provides a fluent validation API built around a small set of composable check classes.

Many flows are now asynchronous. Any API that evaluates promised checks or loads binary data should be awaited before calling `collect()`.

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
- `noExtraFields(options?)` flags undeclared keys when you later call `collect()`, `collectFlat()`, or `collectNested()`
- `check(fn)` applies nested rules and aggregates results asynchronously
- `is_true(fn, options)` applies a custom object-level predicate and supports async predicates
- `result()` returns nested results as collected so far
- `collect()` returns nested results with flattened `hints`, `warnings`, and `errors`
- `collectFlat()` returns a flattened result structure only
- `collectNested()` returns a nested result structure that mirrors the input shape

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
- `check_each(fn)` validates each item using `ArrayItemCheck` and supports promised checks
- `is_true(fn, options)` applies a custom predicate to the array value and supports async predicates
- `is_true_each(fn, options)` runs a custom predicate on every item and supports async predicates
- `result()` returns nested results as collected so far
- `collect()` returns nested results with flattened `hints`, `warnings`, and `errors`
- `collectFlat()` returns a flattened result structure only
- `collectNested()` returns a nested result structure that mirrors the input shape

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

`StringCheck` extends the internal `StringBaseCheck` class, so it inherits the common string comparison and pattern methods listed below and adds higher-level string helpers plus branching into `EmailCheck` and `UrlCheck`.

Methods:

- `trim()` mutates the current string value before later checks
- `minLength(length, options?)`
- `maxLength(length, options?)`
- `oneOf(values, options?)`
- `startsWith(prefix, options?)`
- `endsWith(suffix, options?)`
- `contains(substring, options?)`
- `pattern(regex, options?)`
- `email(options?)` switches into an email-specific validator chain
- `url(options?)` switches into a URL-specific validator chain
- `isBase64(options?)`
- `isSHA256(options?)`
- `isMD5(options?)`
- `isHexadecimal(options?)`
- `isAlphanumeric(options?)`
- `isAscii(options?)`
- `hasMultibyte(options?)`
- `hasUpperCase(minCount?, options?)`
- `hasLowerCase(minCount?, options?)`
- `hasDigit(minCount?, options?)`
- `hasSpecialCharacter(minCount?, options?)`
- `noSpecialCharacters(chars?, options?)`
- `noSpaces(options?)`
- `maxWords(count, options?)`

Notes:

- `oneOf`, `startsWith`, `endsWith`, and `contains` accept `StringCheckOptions` so you can set `case: 'sensitive' | 'insensitive'`
- `email()` and `url()` return specialized check chains for host, TLD, protocol, and port validation

### `EmailCheck`

`EmailCheck` also extends the internal `StringBaseCheck`, so it inherits the common string methods such as `trim()`, `minLength()`, `maxLength()`, `oneOf()`, `startsWith()`, `endsWith()`, `contains()`, and `pattern()`.

Email-specific methods:

- `email(options?)`
- `host(oneOf, options?)`
- `tld(oneOf, options?)`

Creation:

- `field.email()`
- `stringCheck.email()`

### `UrlCheck`

`UrlCheck` also extends the internal `StringBaseCheck`, so it inherits the common string methods such as `trim()`, `minLength()`, `maxLength()`, `oneOf()`, `startsWith()`, `endsWith()`, `contains()`, and `pattern()`.

URL-specific methods:

- `url(options?)`
- `host(oneOf, options?)`
- `tld(oneOf, options?)`
- `protocol(oneOf, options?)`
- `port(oneOf, options?)`

Creation:

- `field.url()`
- `stringCheck.url()`

### `NumberCheck`

Methods:

- `integer(options?)`
- `float(options?)`
- `minPrecision(decimalPlaces, options?)`
- `positive(options?)`
- `negative(options?)`
- `roundUp()` mutates the current numeric value using `Math.ceil`
- `roundDown()` mutates the current numeric value using `Math.floor`
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

`ValueCheck` is an implementation detail for shared fluent behavior. Most consumers should use the concrete check classes directly.

## Inheritance Notes

- `StringBaseCheck` is an internal abstract base class used by `StringCheck`, `EmailCheck`, and `UrlCheck`
- the package does not need to expose `StringBaseCheck` publicly for normal use because its inherited methods are available through the concrete exported classes

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
