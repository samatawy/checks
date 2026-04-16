---
title: Documentation
---

# Documentation

`@samatawy/checks` provides TypeScript validation and object-management utilities for fluent checks, validated object construction, coded results, and lightweight typed store and cache workflows.

The package is still evolving and should not yet be treated as production-tested infrastructure. Breaking changes are still relatively frequent while the API surface is being refined.

It is aimed at business application code that wants a small typed runtime layer around validated DTOs, object hydration, localized coded results, and in-process store or cache helpers without pulling in a larger framework.

The generated docs site is organized into four top-level sections:

- [How-To](how-to/index.md) for recipes, decorated classes, and object hydration
- [Examples](examples/index.md) for end-to-end client and server flows
- [Reference](reference/index.md) for the validation API, localized-result behavior, and standards comparison notes
- [Maintenance](maintenance/index.md) for development and publishing workflows

## Package overview

The public API is exported from [src/index.ts](../src/index.ts) and includes:

- fluent validation classes such as `ObjectCheck`, `ArrayCheck`, and `FieldCheck`
- specialized validators such as `EmailCheck`, `UrlCheck`, `FileCheck`, and `ImageCheck`
- `ObjectFactory` for validated object creation and update flows
- coded-result and i18n helpers such as `CodedMessageCatalog` and `ICodedMessageCatalog`
- cache and store helpers such as `TypeCache`, `ObjectCache`, `ObjectStore`, `CachedObjectStore`, and `InMemoryTypeStore`
- a Node-only schema and message file-loading helper under `@samatawy/checks/node`
- result and option types such as `ResultSet`, `SingleResult`, `ResultCodeDefinition`, and `CheckOptions`
- `result(options?)` as the main output API for nested, flattened, localized, and validated projections

## Highlights

- fluent validation for objects, arrays, fields, strings, numbers, dates, files, and images
- validated object hydration and patch-style updates through `ObjectFactory`
- coded-result and localization workflows for business-facing validation output
- lightweight typed cache and store abstractions for application runtime flows
- support for both synchronous and asynchronous validation patterns

## Recommended reading order

1. Start with the README for a quick usage example.
2. Use [How-To](how-to/index.md) for common validation and hydration tasks.
3. Use [Examples](examples/index.md) for end-to-end client and server patterns.
4. Read [Reference](reference/index.md) when you need API details or coded-result behavior.
5. Review [Maintenance](maintenance/index.md) before extending or publishing the package.

If you are specifically looking for schema-driven validation, start with [SchemaCheck](how-to/schema-check.md) in the How-To section.

If you are evaluating libraries, see [Zod And Ajv Comparison](reference/zod-ajv-comparison.md) in the Reference section.