---
title: How-To
children:
  - ./basic-checks.md
  - ./composite-checks.md
  - ./schema-check.md
  - ./reading-results.md
  - ./decorated-classes.md
  - ./object-factory.md
  - ./coded-results.md
---

# How-To

Use this section when you want task-oriented guidance instead of API-level detail.

Pages in this section:

- [basic-checks.md](basic-checks.md) for day-to-day validation recipes
- [composite-checks.md](composite-checks.md) for `allOf(...)`, `anyOf(...)`, `oneOf(...)`, and `not(...)`
- [schema-check.md](schema-check.md) for validating input against the supported JSON Schema subset
- [reading-results.md](reading-results.md) for `result(options?)` and output shaping
- [decorated-classes.md](decorated-classes.md) for decorator-based class validation
- [object-factory.md](object-factory.md) for validated construction and hydration
- [coded-results.md](coded-results.md) for stable codes and translation catalogs in applied workflows


If you are new to the package, a good reading order is:

1. Start with [basic-checks.md](basic-checks.md) for the most common validation recipes.
2. Continue with [composite-checks.md](composite-checks.md) when you need `allOf(...)`, `anyOf(...)`, `oneOf(...)`, or `not(...)`.
3. Use [schema-check.md](schema-check.md) when you want to validate data from a supported JSON Schema document instead of writing fluent rules directly.
4. Finish with [reading-results.md](reading-results.md) when you need to shape output for application code.