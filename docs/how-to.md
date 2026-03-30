# How To

This guide covers common tasks you are likely to perform with the validation API.

Each example includes the import statement, a complete usage snippet, and the preferred `result(...)` call for the scenario.

## Install The Right Dependencies

For object, array, string, number, and date validation only:

```bash
npm install @samatawy/checks
```

For file and image validation:

```bash
npm install @samatawy/checks file-type probe-image-size
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

Use `check_each(...)` when each array item needs its own rules.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  children: [
    { name: 'A', age: 10 },
    { age: 20 }
  ]
}).check(person => [
  person.required('children').array().check_each(child => [
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

Use `is_true(...)` when built-in checks are not enough.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  child_count: 1,
  children: [{ name: 'A' }, { name: 'B' }]
}).check(person => [
  person.is_true(data => (data.child_count || 0) === (data.children?.length || 0), {
    warn: 'child_count should equal the number of children'
  })
]);

const result = check.result({ flattened: true, language: 'en' });
console.log(result.warnings);
```

## Use An Async Predicate

`is_true(...)` also accepts asynchronous predicates.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  photo: 'data:image/png;base64,...'
}).check(person => [
  person.is_true(async data => {
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

## Choose A Result Shape

Use `result(options?)` to select the output you want.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  profile: {},
  tags: []
}).check(input => [
  input.required('profile').object().notEmpty(),
  input.required('tags').array().notEmpty()
]);

console.log(check.result({ language: 'en' }));
console.log(check.result({ flattened: true, language: 'en' }));
console.log(check.result({ nested: true, language: 'en' }));
console.log(check.result({ raw: true, nested: true, flattened: true, language: 'en' }));
```

Use these options as a rule of thumb:

- `language` for the merged nested result tree
- `flattened: true` when you only need message arrays such as `errors`
- `nested: true` when you want an input-shaped projection under `input`
- `raw: true` when you also want the merged internal result tree exposed under `raw`

## Use Coded Results Only When Needed

If you need stable codes and translation catalogs, read [coded-results.md](coded-results.md).

That page covers:

- `ResultCatalog.global`
- separate `ResultCatalog` instances
- `code` on results
- fallback behavior when a translation is missing

## Pick The Right Entry Point

Use this quick rule of thumb:

- `ObjectCheck.for(data)` for validating a root object
- `ArrayCheck.for(data)` for validating a root array
- `person.required('name').string()` for required fields
- `person.optional('photo').file()` for binary inputs
- `person.optional('photo').image()` for image-specific checks
- `is_true(...)` when the rule is custom or computed