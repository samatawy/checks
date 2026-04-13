---
title: How-To
children:
  - ./basic-checks.md
  - ./composite-checks.md
  - ./reading-results.md
  - ./data-updates.md
  - ./decorated-classes.md
  - ./object-factory.md
  - ./coded-results.md
  - ./schema-check.md
---

# How-To

Use this section when you want task-oriented guidance instead of API-level detail.

Pages in this section:

- [Basic Checks](basic-checks.md) for day-to-day validation recipes
- [Composite Checks](composite-checks.md) for `allOf(...)`, `anyOf(...)`, `oneOf(...)`, and `not(...)`
- [Reading Results](reading-results.md) for `result(options?)` and output shaping
- [Data Updates](data-updates.md) for patch-style update validation, immutability, and update factory flows
- [Decorated Classes](decorated-classes.md) for decorator-based class validation
- [Object Factory](object-factory.md) for validated construction and hydration
- [Coded Message Catalog](coded-results.md) for stable codes, i18n catalogs, and translated output workflows
- [SchemaCheck](schema-check.md) for validating input against the supported JSON Schema subset


If you are new to the package, a good reading order is:

1. Start with [Basic Checks](basic-checks.md) for the most common validation recipes.
2. Continue with [Composite Checks](composite-checks.md) when you need `allOf(...)`, `anyOf(...)`, `oneOf(...)`, or `not(...)`.
3. Read [Data Updates](data-updates.md) when validation depends on both incoming patch data and existing values.
4. Finish with [Reading Results](reading-results.md) when you need to shape output for application code.

Optionally you may also:

1. Read [Decorated Classes](decorated-classes.md) when you want validation rules to live next to DTO-like class definitions. Keeping validity logic in the class definition can often be a clean design.
2. Use [Object Factory](object-factory.md) when validation and object construction or update should happen together. This applies to data classes that know how to validate input and use it.
3. Read [Coded Message Catalog](coded-results.md) when you need stable result codes with localized messages. In addition, you can separate messages from your code and organize them into catalogs.
4. Use [SchemaCheck](schema-check.md) when you want to validate data from a supported JSON Schema document instead of writing fluent rules directly.
5. Read [Platform Compatibility](platform-compatibility.md) when your code must run in both browser and Node or uses binary and schema-file features.
