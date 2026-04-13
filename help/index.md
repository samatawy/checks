---
title: Documentation
---

# Documentation

This package exposes a fluent validation API for working with objects, arrays, fields, strings, numbers, dates, files, and images.

The generated docs site is organized into three top-level sections:

- [How-To](how-to-section.md) for recipes, examples, decorated classes, and object hydration
- [Reference](reference-section.md) for the validation API, localized-result behavior, and standards comparison notes
- [Maintenance](maintenance-section.md) for development and publishing workflows

## Package overview

The public API is exported from [src/index.ts](../src/index.ts) and includes:

- validation classes such as `ObjectCheck`, `ArrayCheck`, and `FieldCheck`
- specialized string validators such as `EmailCheck` and `UrlCheck`
- async-capable binary validators such as `FileCheck` and `ImageCheck`
- a Node-only schema file-loading helper under `@samatawy/checks/node`
- result and option types such as `ResultSet`, `SingleResult`, `ResultCodeDefinition`, and `CheckOptions`
- `CodedMessageCatalog` and `ICodedMessageCatalog` for optional code-to-message mapping
- `result(options?)` as the main output API for nested, flattened, and input-shaped projections

## Recommended reading order

1. Start with the README for a quick usage example.
2. Use [How-To](how-to-section.md) for common tasks and end-to-end examples.
3. Read [Reference](reference-section.md) when you need API details or coded-result behavior.
4. Review [Maintenance](maintenance-section.md) before extending or publishing the package.

If you are specifically looking for schema-driven validation, start with [SchemaCheck](schema-check.md) in the How-To section.