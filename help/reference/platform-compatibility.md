---
title: Platform Compatibility
group: Reference
category: Common Tasks
---

# Platform Compatibility

`@samatawy/checks` is designed so the core validation API works in both Node and browser runtimes.

Some features are universal, some depend on optional peer packages, and a small part is intentionally Node-only.

## Compatibility Matrix

| Feature | Browser | Node | Notes |
| --- | --- | --- | --- |
| `ObjectCheck`, `FieldCheck`, `ArrayCheck`, `ArrayItemCheck` | Yes | Yes | Core fluent validation is platform-neutral. |
| String, number, boolean, date, UUID, ULID, email, URL checks | Yes | Yes | Uses standard JavaScript APIs. |
| Update helpers such as `updating(...)`, `canUpdate(...)`, `immutable()`, `canAdd(...)`, `canDelete(...)` | Yes | Yes | No platform-specific dependencies. |
| `ObjectFactory` | Yes | Yes | Depends only on the validation logic you attach to it. |
| `CodedMessageCatalog` | Yes | Yes | Pure message and code lookup. |
| `SchemaCheck.from(schema)` | Yes | Yes | Inline schema objects are portable. |
| `loadSchemaCheckFromFile(...)` from `@samatawy/checks/node` | No | Yes | Loads a schema file from disk through Node file I/O. |
| `loadCodedMessagesFromFile(...)` from `@samatawy/checks/node` | No | Yes | Loads external translation JSON files and merges them into a catalog at runtime. |
| `FileCheck` | Yes | Yes | Requires the optional `file-type` peer dependency when used. |
| `ImageCheck` | Conditional | Yes | Requires `probe-image-size` in Node. In browsers it depends on `createImageBitmap(...)` support. |

## Core API That Works Everywhere

For object, array, string, number, date, update, factory, and coded-message workflows, the main package entrypoint is intended to work in both browser and Node runtimes.

```ts
import { ObjectCheck, CodedMessageCatalog } from '@samatawy/checks';
```

## Node-Only Schema File Loading

If your schema lives on disk, use the dedicated Node-only entrypoint.

```ts
import { loadSchemaCheckFromFile } from '@samatawy/checks/node';

const schemaCheck = await loadSchemaCheckFromFile('./person.schema.json');
const result = await schemaCheck.checkResult({ name: 'Ada' });
```

That entrypoint exists so the main package import does not need Node file-system APIs.

If the schema already exists as an object in application code, use the normal portable API instead:

```ts
import { SchemaCheck } from '@samatawy/checks';

const schemaCheck = SchemaCheck.from(schemaObject);
```

## Binary Validation Dependencies

Install extra packages only when you use binary checks:

```bash
npm install @samatawy/checks file-type probe-image-size
```

- `file-type` is used by `FileCheck` to detect MIME types.
- `probe-image-size` is used by `ImageCheck` in Node runtimes.
- browser image checks can use `createImageBitmap(...)` instead of `probe-image-size`.

## Browser Notes For ImageCheck

`ImageCheck` works in browsers only when the runtime exposes `createImageBitmap(...)`.

If that API is missing, image dimension checks cannot load metadata and the image will be treated as invalid.

## Practical Guidance

Use the main package import for most application code.

Use `@samatawy/checks/node` only in Node code that reads schema files or external coded-message translation files from disk.

Install `file-type` and `probe-image-size` only when you actually use `FileCheck` or `ImageCheck`.