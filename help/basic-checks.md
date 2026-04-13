---
title: Basic Checks
group: Guides
category: Common Tasks
---

# Basic Checks

This guide covers the most common validation recipes you are likely to use first.

## Install The Right Dependencies

For object, array, string, number, and date validation only:

```bash
npm install @samatawy/checks
```

For file and image validation:

```bash
npm install @samatawy/checks file-type probe-image-size
```

If you need to load JSON Schema files from disk in Node, the Node-only helper lives under a separate entrypoint:

```ts
import { loadSchemaCheckFromFile } from '@samatawy/checks/node';
```

## Validate A Simple Object

Use `ObjectCheck` when you want to validate a plain object and return the merged nested result tree.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  name: 'Sam',
  age: 34
}).check(person => [
  person.required('name').string().minLength(2),
  person.optional('age').number().atLeast(18)
]);

const result = check.result({ language: 'en' });
console.log(result);
```

## Require Nested Object Fields

Use nested `check(...)` calls when a field itself is an object.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  address: {
    city: 'Cairo'
  }
}).check(person => [
  person.required('address').object().check(address => [
    address.required('street').string(),
    address.required('city').string()
  ])
]);

const result = check.result({ flattened: true, language: 'en' });
console.log(result.errors);
```

## Validate Array Items

Use `checkEach(...)` when each array item needs its own rules.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  children: [
    { name: 'A', age: 10 },
    { age: 20 }
  ]
}).check(person => [
  person.required('children').array().checkEach(child => [
    child.object(),
    child.required('name').string(),
    child.optional('age').number().atMost(17)
  ])
]);

const result = check.result({ raw: true, flattened: true, language: 'en' }) as any;

console.log(result.raw.results);
console.log(result.errors);
```

## Add A Custom Predicate

Use `isTrue(...)` when built-in checks are not enough.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  child_count: 1,
  children: [{ name: 'A' }, { name: 'B' }]
}).check(person => [
  person.isTrue(data => (data.child_count || 0) === (data.children?.length || 0), {
    warn: 'child_count should equal the number of children'
  })
]);

const result = check.result({ flattened: true, language: 'en' });
console.log(result.warnings);
```

## Use An Async Predicate

`isTrue(...)` also accepts asynchronous predicates.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  photo: 'data:image/png;base64,...'
}).check(person => [
  person.isTrue(async data => {
    return typeof data.photo === 'string' && data.photo.startsWith('data:image/');
  }, { err: 'Photo must be an image data URL' })
]);

const result = check.result({ flattened: true, language: 'en' });
console.log(result.errors);
```

## Validate File Size And MIME Type

Use `file()` for binary payloads, browser `File` objects, blobs, buffers, or `data:` URLs.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  avatar: fileInput.files?.[0]
}).check(person => [
  person.optional('avatar').file().then(file =>
    file.notEmpty()
      .mimeType('image/*')
      .minSize(5 * 1024)
      .maxSize(5 * 1024 * 1024)
  )
]);

const result = check.result({ flattened: true, language: 'en' });
console.log(result.errors);
```

## Validate Image Dimensions

Use `image()` when you need width and height checks in addition to basic file validation.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  photo: fileInput.files?.[0]
}).check(person => [
  person.optional('photo').image().then(image =>
    image.isImage()
      .minWidth(200)
      .minHeight(200)
      .maxWidth(2000)
      .maxHeight(2000)
  )
]);

const result = check.result({ flattened: true, language: 'en' });
console.log(result.errors);
```

## Pick The Right Entry Point

Use this quick rule of thumb:

- `ObjectCheck.for(data)` for validating a root object
- `ArrayCheck.for(data)` for validating a root array
- `person.required('name').string()` for required fields
- `person.optional('photo').file()` for binary inputs
- `person.optional('photo').image()` for image-specific checks
- `isTrue(...)` when the rule is custom or computed