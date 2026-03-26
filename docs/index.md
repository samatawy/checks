# Documentation

This package exposes a fluent validation API for working with objects, arrays, fields, strings, numbers, dates, files, and images.

## Guides

- [checks.md](checks.md) for the validation classes, types, and usage patterns
- [how-to.md](how-to.md) for task-oriented recipes with imports and sample output
- [development.md](development.md) for local development and maintenance
- [publishing.md](publishing.md) for release and publish steps

## Package overview

The public API is exported from [src/index.ts](../src/index.ts) and includes:

- validation classes such as `ObjectCheck`, `ArrayCheck`, and `FieldCheck`
- async-capable binary validators such as `FileCheck` and `ImageCheck`
- result and option types such as `ResultSet`, `SingleResult`, and `CheckOptions`
- helpers such as `defined()`, `appendError()`, `collectResults()`, and `buildErrorMessage()`
- the starter utility `createPackageSummary()`

## Recommended reading order

1. Start with the README for a quick usage example.
2. Use [how-to.md](how-to.md) for common tasks and complete recipes.
3. Use [checks.md](checks.md) as the API reference.
4. Review [development.md](development.md) before extending the package.
5. Review [publishing.md](publishing.md) before release.