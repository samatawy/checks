# @samatawy/checks

TypeScript validation utilities for fluent object, array, field, string, number, date, file, and image checks.

The main focus is on developer convenience and maintainability. The code is optimized for readability, IDE and AI friendliness, declarative class decoration, etc.

The other focus is on business applications. Features such as error code management and i18n are designed for use in large projects with strict requirements.

The package builds to both ESM and CommonJS, ships declaration files, and supports both synchronous and asynchronous validation flows.

## Where It Fits

This package is a good fit when validation is part of application logic instead of a one-off form helper. Typical examples are:
 - API payload validation and import pipelines, 
 - data quality audit workflows,
 - admin workflows that need warnings as well as errors, 
 - and file intake flows that need MIME, size, or image-dimension checks.

## Documentation

Start with the hosted docs at [samatawy.github.io/checks](https://samatawy.github.io/checks/).

For the local guides in this repo, the most useful entry points are:

- [help/index.md](help/index.md) for the docs overview
- [help/basic-checks.md](help/basic-checks.md) for common validation patterns
- [help/composite-checks.md](help/composite-checks.md) for `allOf(...)`, `anyOf(...)`, `oneOf(...)`, and `not(...)`
- [help/schema-check.md](help/schema-check.md) for validating input from the supported JSON Schema subset
- [help/reading-results.md](help/reading-results.md) for `flattened`, `nested`, and `validated` output
- [help/checks.md](help/checks.md) for the full API reference

Run `npm run docs` to generate the local docs site in `docs/`.

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

Use `result(options?)` to select the output shape that fits the caller.

Example:

```ts
const output = check.result({
  flattened: true,
  validated: 'partial',
  language: 'en'
});

console.log(output.errors);
console.log(output.validated);
```

The most common patterns are `result({ language })` for the merged result tree, `result({ flattened: true })` for plain message arrays, and `result({ validated: 'partial' | 'strict' })` when you want a filtered clone of the validated input. For the complete result guide, see [help/reading-results.md](help/reading-results.md).

## Validation Model

The fluent API accumulates validation output as you compose rules. A small example:

```ts
const check = await ObjectCheck.for({
  profile: {
    name: '  Ada  ',
    age: '37'
  }
}).check(root => [
  root.required('profile').object().anyOf([
    profile => [
      profile.required('name').string().trim().minLength(3)
    ],
    profile => [
      profile.required('age').number({ tolerant: true }).greaterThan(17)
    ]
  ])
]);
```

That example shows the usual style: start at `ObjectCheck.for(...)`, branch to typed field validators, and use composition helpers only where you actually need alternatives. For a broader walkthrough, see [help/basic-checks.md](help/basic-checks.md) and [help/composite-checks.md](help/composite-checks.md).

If your validation rules already exist as a supported JSON schema document, see [help/schema-check.md](help/schema-check.md) instead of translating everything to fluent rules by hand.

## Object Factory

If a class exposes static `validateInput(input)` and `fromValidInput(input)` methods, `ObjectFactory` can validate input and then hydrate an instance. See [help/object-factory.md](help/object-factory.md).

## Coded Results

Stable result codes and translated output are supported, but optional. If you need catalogs, codes, or localized messages, see [help/coded-results.md](help/coded-results.md).

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

For contributor workflows and publishing details, see [help/development.md](help/development.md) and [help/publishing.md](help/publishing.md).

## License

MIT