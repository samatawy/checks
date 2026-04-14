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

- [Documentation](help/index.md) for the docs overview
- [Basic Checks](help/how-to/basic-checks.md) for common validation patterns
- [Composite Checks](help/how-to/composite-checks.md) for `allOf(...)`, `anyOf(...)`, `oneOf(...)`, and `not(...)`
- [SchemaCheck](help/how-to/schema-check.md) for validating input from the supported JSON Schema subset
- [Reading Results](help/how-to/reading-results.md) for `flattened`, `nested`, and `validated` output
- [Checks API](help/reference/checks.md) for the full API reference

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

If you load JSON Schema files from disk in Node, use the dedicated Node-only entrypoint:

```ts
import { loadSchemaCheckFromFile } from '@samatawy/checks/node';
```

The same Node-only entrypoint can also load external coded-message translation files at runtime:

```ts
import { CodedMessageCatalog } from '@samatawy/checks';
import { loadCodedMessagesFromFile } from '@samatawy/checks/node';

const catalog = new CodedMessageCatalog();

await loadCodedMessagesFromFile(catalog, './messages.json');
```

In that JSON file, use `err`, `warn`, and `hint` first. A plain string means English by default, while a nested object can provide explicit languages:

```json
{
  "person.age.invalid": {
    "err": "Age must be a number"
  },
  "person.name.missing": {
    "err": {
      "en": "Name is required",
      "de": "Name ist erforderlich"
    }
  }
}
```

If you are validating against inline schema objects, the main package import remains portable.

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

The most common patterns are `result({ language })` for the merged result tree, `result({ flattened: true })` for plain message arrays, and `result({ validated: 'partial' | 'strict' })` when you want a filtered clone of the validated input. For the complete result guide, see [Reading Results](help/how-to/reading-results.md).

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

That example shows the usual style: start at `ObjectCheck.for(...)`, branch to typed field validators, and use composition helpers only where you actually need alternatives. For a broader walkthrough, see [Basic Checks](help/how-to/basic-checks.md) and [Composite Checks](help/how-to/composite-checks.md).

If your validation rules already exist as a supported JSON schema document, see [SchemaCheck](help/how-to/schema-check.md) instead of translating everything to fluent rules by hand.

## Object Factory

If a class exposes static `validateInput(input)` and `fromValidInput(input)` methods, `ObjectFactory` can validate input and then hydrate an instance. It can also update an existing instance from JSON input when the class exposes static `validateUpdate(oldValue, newValue)` and `updateFrom(existing, input)` methods. See [Object Factory](help/how-to/object-factory.md).

```ts
const existing = new PersonDto('Ada', 'Lead');

const updatedPerson = await ObjectFactory.updateOrThrow(existing, {
  title: 'Architect'
}, PersonDto);
```

That update flow is useful for patch-style JSON input where validation depends on both the current instance and the incoming changes.

`ObjectFactory.create(...)` and `ObjectFactory.update(...)` return a wrapper object with `valid`, `instance`, and `result(options?)`, which is useful when the caller needs both the hydrated instance on success and the validation details on failure.

## Coded Results

Stable result codes and translated output are supported, but optional. If you need catalogs, codes, or localized messages, see [Coded Message Catalog](help/how-to/coded-results.md).

In Node runtimes, translations can also be loaded from external JSON files through `@samatawy/checks/node` so translators can work on one language file at a time.

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

## Platform Compatibility

The core fluent validation API is intended to work in both browser and Node runtimes.

Platform-specific areas:

- `@samatawy/checks/node` is Node-only because it reads schema files from disk
- `FileCheck` requires the optional `file-type` peer when used
- `ImageCheck` requires `probe-image-size` in Node and browser support for `createImageBitmap(...)` when used in the browser

See [Platform Compatibility](help/reference/platform-compatibility.md) for the full matrix.

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

For contributor workflows and publishing details, see [Development](help/maintenance/development.md) and [Publishing](help/maintenance/publishing.md).

## License

MIT