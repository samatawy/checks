# @samatawy/checks

TypeScript validation utilities for fluent object, array, field, string, number, date, file, and image checks.

The main focus is on developer convenience and maintainability. The code is optimized for readability, IDE and AI friendliness, declarative class decoration, etc.

The other focus is on business applications. Features such as error code management and i18n are designed for use in large projects with strict requirements.

The package builds to both ESM and CommonJS, ships declaration files, and supports both synchronous and asynchronous validation flows.

## Documentation

- Developer guides:
- [help/index.md](help/index.md)
- [help/checks.md](help/checks.md)
- [help/how-to.md](help/how-to.md)
- [help/decorated-classes.md](help/decorated-classes.md)
- [help/object-factory.md](help/object-factory.md)
- [help/coded-results.md](help/coded-results.md)
- [help/development.md](help/development.md)
- [help/publishing.md](help/publishing.md)

- Generated API reference:
- Run `npm run docs` to generate the API reference in `docs/`.
- The generated entry page is `docs/index.html`.
- The generated module overview is `docs/modules.html`.

- Hosted API reference: [samatawy.github.io/checks](https://samatawy.github.io/checks/)

## Where It Fits

This package is a good fit when validation is part of application logic instead of a one-off form helper.

Typical uses:

- data ingestion pipelines that need to validate imported records before persistence
- data quality audits that need both nested findings and flattened issue lists
- API boundary validation for request payloads, events, or jobs
- admin or back-office tooling that needs warnings and hints, not just hard failures
- file and image intake flows that need MIME, size, or dimension checks

## Installation

```bash
npm install @samatawy/checks
```

### Optional peer dependencies

The core object, array, string, number, and date validators work with just the main package.

If you use `FileCheck`, `ImageCheck`, `field.file()`, or `field.image()`, also install the binary inspection peer dependencies:

```bash
npm install @samatawy/checks file-type probe-image-size
```

Why these are optional:

- `file-type` is used to detect MIME types from file buffers
- `probe-image-size` is used for image metadata in Node runtimes
- browser image dimension checks can also use browser-native APIs

## Quick Start

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

const result = check.result({ language: 'en' });

if (!result.valid) {
  console.error(result.results);
}
```

`check`, `isTrue`, `checkEach`, `isTrueEach`, `file`, `image`, and decorated object validation may all become async depending on the validators you use, so `await` at the outer rule boundary is the safe default.

## Getting Results

The package now uses `result(options?)` as the main output API.

For object and array checks:

- `result({ language })` returns the merged nested result tree
- `result({ flattened: true, language })` returns flattened `hints`, `warnings`, and `errors`
- `result({ nested: true, language })` returns an input-shaped projection under `input`
- `result({ raw: true, nested: true, flattened: true, language })` returns all projections at once

For value-level checks such as `FieldCheck`, `StringCheck`, or `NumberCheck`, `result({ language })` returns the finalized single result.

Example:

```ts
const output = check.result({
  raw: true,
  nested: true,
  flattened: true,
  language: 'en'
});

console.log(output.raw);
console.log(output.input);
console.log(output.errors);
```

Use `result()` with no options when you want the current internal result state while building advanced flows. For application-facing output, prefer explicit result options.

## Public API

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

### Result and option types

- `Check`
- `CheckOptions`
- `StringCheckOptions`
- `TolerantCheckOptions`
- `IResult`
- `SingleResult`
- `ResultSet`
- `ResultCode`
- `ResultCodeDefinition`
- `IResultCatalog`

### Catalog exports

- `ResultCatalog`
- `ResultCatalog.global`

## Validation Model

The fluent API accumulates validation output while you compose rules.

- `required(name)` asserts that a field exists
- `optional(name)` starts a field check without requiring presence
- `conditional(name, condition)` requires a field only when another condition is met
- `noExtraFields()` rejects undeclared object keys in final object results
- `check(...)` applies nested object or array rules
- `checkEach(...)` applies nested rules to each array item
- `noDuplicates()` rejects duplicate array values or duplicate keys when you provide a selector key
- `isTrue(...)` and `isTrueEach(...)` add custom predicates
- `file()` and `image()` create asynchronously initialized binary validators
- `email()` and `url()` branch into specialized string validators

String-related inheritance:

- `StringCheck`, `EmailCheck`, and `UrlCheck` share common string comparison methods through the internal `StringBaseCheck`
- `StringBaseCheck` itself is not part of the public API

## Object Factory

If a class exposes static `validateInput(input)` and `fromValidInput(input)` methods, you can validate input and hydrate an instance with `ObjectFactory`.

Use:

- `ObjectFactory.create(...)` for the full factory result including `check`
- `ObjectFactory.createOrThrow(...)` for exception-based flow
- `ObjectFactory.createOrErrors(...)` for a non-throwing `{ instance }` or `{ errors }` shortcut

The dedicated guide is here:

- [help/object-factory.md](help/object-factory.md)

## Coded Results

Stable result codes and translated output are supported, but they are optional. If you just need direct inline messages, you can ignore that layer entirely.

The dedicated guide is here:

- [help/coded-results.md](help/coded-results.md)

## File And Image Validation

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

const result = check.result({ flattened: true, language: 'en' });
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

## License

MIT