# @samatawy/checks

TypeScript validation utilities for fluent object, array, field, string, number, date, file, and image checks.

The package builds to both ESM and CommonJS, ships declaration files, and exposes a validation DSL that supports both synchronous and asynchronous rules.

## Installation

```bash
npm install @samatawy/checks
```

### Optional peer dependencies

The core object, array, string, number, and date validators work with just:

```bash
npm install @samatawy/checks
```

If you use `FileCheck`, `ImageCheck`, `field.file()`, or `field.image()`, also install the binary inspection peer dependencies:

```bash
npm install @samatawy/checks file-type probe-image-size
```

Why these are optional:

- `file-type` is used to detect MIME types from file buffers
- `probe-image-size` is used for image metadata in Node runtimes
- browser image dimension checks can also use browser-native APIs, so these packages are not required for every consumer

## Quick start

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  name: 'Sam',
  age: 34,
  address: {
    city: 'Cairo'
  }
})
  .notEmpty()
  .check(person => [
    person.required('name').string().minLength(2),
    person.optional('age').number().atLeast(18),
    person.required('address').object().check(address => [
      address.required('city').string()
    ])
  ]);

const result = check.collect();

if (!result.valid) {
  console.error(result.errors);
}
```

`check`, `rules`, `is_true`, `check_each`, `is_true_each`, `file`, and `image` may all be async depending on which validators you use, so `await` at the rule boundary is the safe default.

## Public API

### Entry points

Everything is exported from the package root in [src/index.ts](src/index.ts).

### Check classes

- `ObjectCheck`
- `FieldCheck`
- `ArrayCheck`
- `ArrayItemCheck`
- `StringCheck`
- `EmailCheck`
- `UrlCheck`
- `NumberCheck`
- `DateCheck`
- `FileCheck`
- `ImageCheck`
- `ValueCheck`

### Shared types

- `Check`
- `CheckOptions`
- `StringCheckOptions`
- `SingleResult`
- `ResultSet`
- `IResult`

## Validation model

The API is designed around fluent checks that accumulate validation output.

- `required(name)` asserts that a field exists
- `optional(name)` starts a field check without requiring presence
- `conditional(name, condition)` requires a field only when another condition is met
- `noExtraFields()` rejects undeclared object keys when collecting results
- `check(...)` applies nested object rules
- `check(...)` on arrays applies array-level rules and nested synthetic results
- `check_each(...)` applies nested array item rules
- `noDuplicates()` rejects duplicate array values or duplicate keys when you provide a selector key
- `is_true(...)` and `is_true_each(...)` let you add custom predicates
- `file()` and `image()` create asynchronously initialized binary validators
- `email()` and `url()` are available from both `FieldCheck` and `StringCheck` and branch into protocol-specific validators
- `trim()`, `integer()`, `positive()`, `isBase64()`, and related helpers support common string and number validation tasks
- `result()` returns the immediate result state
- `collect()` returns nested results with flattened `hints`, `warnings`, and `errors`
- `collectFlat()` returns a flattened result structure only
- `collectNested()` returns a nested result structure that mirrors the input shape

String-related inheritance:

- `StringCheck`, `EmailCheck`, and `UrlCheck` share the common string comparison methods through an internal `StringBaseCheck`
- those inherited methods are available on the exported concrete classes; `StringBaseCheck` itself is internal and is not required for consumers

Example with warnings and nested arrays:

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  child_count: 2,
  children: [{ name: 'A', age: 10 }, { name: 'B', age: 19 }]
})
  .check(person => [
    person.optional('children').array().maxLength(10)
      .check_each(child => [
        child.object(),
        child.required('name').string(),
        child.optional('age').number().greaterThan(0).atMost(17)
      ]),
    person.is_true(data => (data.child_count || 0) === (data.children?.length || 0), {
      warn: 'child_count should equal the number of children'
    })
  ]);

const result = check.collect();
```

Example with files and images:

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for(input).check(person => [
  person.optional('avatar').file().then(file =>
    file.notEmpty()
      .mimeType('image/*')
      .minSize(5 * 1024)
      .maxSize(5 * 1024 * 1024)
  ),
  person.optional('avatar').image().then(image =>
    image.isImage()
      .minWidth(200)
      .minHeight(200)
      .maxWidth(2000)
      .maxHeight(2000)
  )
]);

const result = check.collect();
```

## Result shapes

`SingleResult` represents a single validation outcome.

```ts
interface SingleResult {
  valid: boolean;
  field?: string | number | null | undefined;
  hint?: string | string[];
  warn?: string | string[];
  err?: string;
}
```

`ResultSet` extends that model with nested `results` plus flattened `hints`, `warnings`, and `errors` arrays.

`CheckOptions` supports either a single hint/warn string or an array of messages:

```ts
interface CheckOptions {
  hint?: string | string[];
  warn?: string | string[];
  err?: string;
}
```

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

Useful scripts:

- `npm run build` builds ESM, CJS, and declaration files into `dist/`
- `npm run dev` watches the package entrypoint
- `npm run lint` runs TypeScript type checking
- `npm test` runs the Vitest suite once
- `npm run test:watch` runs Vitest in watch mode

When validating integration in this workspace, use the package build output from `dist/` and then rebuild the local consumer package if it depends on `file:../checks`.

## Documentation

- [docs/index.md](docs/index.md)
- [docs/checks.md](docs/checks.md)
- [docs/how-to.md](docs/how-to.md)
- [docs/development.md](docs/development.md)
- [docs/publishing.md](docs/publishing.md)

## License

MIT