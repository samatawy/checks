# Documentation

This package exposes a fluent validation API for working with objects, arrays, fields, strings, numbers, dates, files, and images.

## Guides

- [checks.md](checks.md) for the validation classes, types, and usage patterns
- [how-to.md](how-to.md) for task-oriented recipes with imports and sample output
- [coded-results.md](coded-results.md) for optional result-code catalogs and translation
- [development.md](development.md) for local development and maintenance
- [publishing.md](publishing.md) for release and publish steps

## Package overview

The public API is exported from [src/index.ts](../src/index.ts) and includes:

- validation classes such as `ObjectCheck`, `ArrayCheck`, and `FieldCheck`
- specialized string validators such as `EmailCheck` and `UrlCheck`
- async-capable binary validators such as `FileCheck` and `ImageCheck`
- result and option types such as `ResultSet`, `SingleResult`, `ResultCodeDefinition`, and `CheckOptions`
- `ResultCatalog` and `IResultCatalog` for optional code-to-message mapping
- `result(options?)` as the main output API for nested, flattened, and input-shaped projections

## Recommended reading order

1. Start with the README for a quick usage example.
2. Use [how-to.md](how-to.md) for common tasks and complete recipes.
3. Read [coded-results.md](coded-results.md) only if you need stable codes or translation catalogs.
4. Use [checks.md](checks.md) as the API reference.
5. Review [development.md](development.md) before extending the package.
6. Review [publishing.md](publishing.md) before release.