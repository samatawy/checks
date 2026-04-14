---
title: Documentation
---

# Documentation

This package exposes a fluent validation API for working with objects, arrays, fields, strings, numbers, dates, files, and images.

The generated docs site is organized into four top-level sections:

- [How-To](how-to/index.md) for recipes, decorated classes, and object hydration
- [Examples](examples/index.md) for end-to-end client and server flows
- [Reference](reference/index.md) for the validation API, localized-result behavior, and standards comparison notes
- [Maintenance](maintenance/index.md) for development and publishing workflows

## Package overview

The public API is exported from [src/index.ts](../src/index.ts) and includes:

- validation classes such as `ObjectCheck`, `ArrayCheck`, and `FieldCheck`
- specialized string validators such as `EmailCheck` and `UrlCheck`
- async-capable binary validators such as `FileCheck` and `ImageCheck`
- cache and store helpers such as `TypeCache`, `ObjectCache`, `ObjectStore`, and `CachedObjectStore`
- a Node-only schema file-loading helper under `@samatawy/checks/node`
- result and option types such as `ResultSet`, `SingleResult`, `ResultCodeDefinition`, and `CheckOptions`
- `CodedMessageCatalog` and `ICodedMessageCatalog` for optional code-to-message mapping
- `result(options?)` as the main output API for nested, flattened, and input-shaped projections

## Recommended reading order

1. Start with the README for a quick usage example.
2. Use [How-To](how-to/index.md) for common validation and hydration tasks.
3. Use [Examples](examples/index.md) for end-to-end client and server patterns.
4. Read [Reference](reference/index.md) when you need API details or coded-result behavior.
5. Review [Maintenance](maintenance/index.md) before extending or publishing the package.

If you are specifically looking for schema-driven validation, start with [SchemaCheck](how-to/schema-check.md) in the How-To section.

If you are evaluating libraries, see [Zod And Ajv Comparison](reference/zod-ajv-comparison.md) in the Reference section.