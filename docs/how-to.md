# How To

This guide covers common tasks you are likely to perform with the validation API.

Each example includes:

- the import statement
- a complete usage snippet
- a sample output shape

## Install The Right Dependencies

For object, array, string, number, and date validation only:

```bash
npm install @samatawy/checks
```

For file and image validation:

```bash
npm install @samatawy/checks file-type probe-image-size
```

Why there are two install paths:

- `file-type` and `probe-image-size` are optional peer dependencies
- they are only needed for binary inspection features
- many consumers will never use `file()` or `image()`

## Validate A Simple Object

Use `ObjectCheck` when you want to validate a plain object and collect a final result.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  name: 'Sam',
  age: 34
}).check(person => [
  person.required('name').string().minLength(2),
  person.optional('age').number().atLeast(18)
]);

const result = check.collect();
console.log(result);
```

Sample output:

```json
{
  "valid": true,
  "results": []
}
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

const result = check.collect();
console.log(result);
```

Sample output:

```json
{
  "valid": false,
  "results": [
    {
      "field": "address",
      "valid": false,
      "results": [
        {
          "field": "street",
          "valid": false,
          "err": "Field street is required"
        }
      ]
    }
  ],
  "errors": [
    "Field street is required"
  ]
}
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

const result = check.collect();
console.log(result);
```

Sample output:

```json
{
  "valid": false,
  "errors": [
    "Field 1.name is required",
    "Field 1.age must be a number at most 17"
  ]
}
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

const result = check.collect();
console.log(result);
```

Sample output:

```json
{
  "valid": true,
  "warnings": [
    "child_count should equal the number of children"
  ]
}
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

const result = check.collect();
console.log(result);
```

Sample output:

```json
{
  "valid": false,
  "errors": [
    "Photo must be an image data URL"
  ]
}
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

const result = check.collect();
console.log(result);
```

Sample output:

```json
{
  "valid": false,
  "errors": [
    "Field avatar must be at least 5120 bytes"
  ]
}
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

const result = check.collect();
console.log(result);
```

Sample output:

```json
{
  "valid": false,
  "errors": [
    "Field photo must be at least 200 pixels wide"
  ]
}
```

## Use Helper Functions Directly

The helper exports are useful when you are building custom wrappers around the check classes.

```ts
import {
  appendError,
  buildErrorMessage,
  collectResults,
  defined,
  type ResultSet
} from '@samatawy/checks';

const base = buildErrorMessage('Name is required');

let result: ResultSet = { valid: true, results: [base] };
result = appendError(result, 'Age must be at least 18') as ResultSet;

const finalResult = collectResults(result);

if (defined(finalResult.errors)) {
  console.log(finalResult.errors);
}
```

Sample output:

```json
[
  "Name is required",
  "Age must be at least 18"
]
```

## Pick The Right Entry Point

Use this quick rule of thumb:

- `ObjectCheck.for(data)` for validating a root object
- `ArrayCheck.for(data)` for validating a root array
- `person.required('name').string()` for required fields
- `person.optional('photo').file()` for binary inputs
- `person.optional('photo').image()` for image-specific checks
- `is_true(...)` when the rule is custom or computed