---
title: JSON Schema Comparison
group: Reference
category: Standards Comparison
---

# JSON Schema Comparison

This guide compares `@samatawy/checks` with the JSON Schema standard.

The short version is:

- `@samatawy/checks` overlaps with many common validation tasks expressed in JSON Schema
- it is not a JSON Schema implementation
- it can now read a limited subset of JSON Schema documents through `SchemaCheck`, but it does not emit or fully model the standard

Use JSON Schema when you need standards-based interoperability. Use `@samatawy/checks` when you want fluent rules, async validation, decorator-based models, result catalogs, or validated runtime output.

`SchemaCheck` can ingest either a schema object or a JSON schema file path and map the supported subset into the fluent validation API. That is useful for application-owned schemas, but it is still intentionally narrower than full JSON Schema tooling.

## What Matches Well

These JSON Schema-style concerns map well to the package:

- object validation through `ObjectCheck`
- required versus optional fields
- nested objects and arrays
- per-item array validation with `checkEach(...)`
- string validation such as min and max length, regex patterns, and fixed allowed values
- number validation such as integer checks and numeric bounds
- additional-property style enforcement through `noExtraFields()`
- email and URL validation through specialized checks

Examples of rough equivalents:

- JSON Schema `type: object` maps to `object()` or `ObjectCheck.for(...)`
- JSON Schema `required` maps to `required(name)`
- JSON Schema `minLength` and `maxLength` map to string checks of the same intent
- JSON Schema `pattern` maps to `string().pattern(...)`
- JSON Schema `enum` maps roughly to `string().equalsOneOf(...)` or similar value checks
- JSON Schema `minimum` and `maximum` map roughly to `atLeast(...)` and `atMost(...)`
- JSON Schema `additionalProperties: false` maps roughly to `noExtraFields()`
- JSON Schema `allOf`, `anyOf`, `oneOf`, and `not` map roughly to fluent composition helpers such as `ObjectCheck.allOf(...)`, `ObjectCheck.anyOf(...)`, `ObjectCheck.oneOf(...)`, and `ObjectCheck.not(...)`

## Where This Package Is Better

In several areas, `@samatawy/checks` is more application-focused than JSON Schema:

- async validation is built in
- custom predicates can use arbitrary code through `isTrue(...)` and `isTrueEach(...)`
- binary validation is supported through `file()` and `image()`
- result output includes hints, warnings, errors, codes, translations, and flattened projections
- `validated: 'partial' | 'strict'` can return a filtered runtime clone of the input
- decorator-based validation definitions are supported for class-style DTOs
- `ObjectFactory` can validate and then hydrate class instances

These features are especially useful for server-side business validation, ingestion pipelines, and rich UI workflows where messages and filtered output matter as much as pass or fail.

## Where This Package Is Lacking

The package does not cover the full JSON Schema standard.

Notable gaps include:

- only partial JSON Schema document ingestion through `SchemaCheck.from(...)` and `SchemaCheck.fromFile(...)`
- no `$schema`, `$id`, `$defs`, or `$ref`
- no `if` / `then` / `else`
- no `dependentRequired` or `dependentSchemas`
- no `patternProperties`, `propertyNames`, or `unevaluatedProperties`
- no tuple-style array schemas such as `prefixItems`
- no `unevaluatedItems` support for array items left over after other item rules
- no direct support for standard annotation keywords such as `title`, `description`, `default`, `examples`, `readOnly`, or `writeOnly`
- no standards-compatible export that another JSON Schema tool can consume

For clarity on the array-specific keywords:

- JSON Schema `contains` means at least one array item must match a nested schema
- `minContains` and `maxContains` refine that by constraining how many items may match
- `prefixItems` is for tuple-style arrays where each position has its own schema
- `unevaluatedItems` governs leftover items that were not already consumed by other array keywords

`SchemaCheck` now supports `contains`, `minContains`, and `maxContains` within its supported array subset.

`prefixItems` and `unevaluatedItems` are still valid JSON Schema concepts that `SchemaCheck` currently rejects rather than attempting a partial translation into the fluent API.

Current limitation of the composition support:

- `SchemaCheck` now supports `allOf`, `anyOf`, `oneOf`, and `not` within the current supported subset, including object schemas, field schemas, array schemas, and array item schemas
- `SchemaCheck` also supports common core keywords such as `type`, `properties`, `required`, `additionalProperties: false`, `items`, string constraints, numeric constraints, `enum`, and `const`
- the implementation still maps those keywords into the fluent validation API; it is not a full standards-complete JSON Schema composition engine
- they are TypeScript API constructs, not schema-document keywords that can be serialized or exchanged with other tools

So while the package can express many of the same rules, it does not provide standards interoperability.

## Practical Coverage Summary

If the question is “can this package validate many of the same things I would normally validate with JSON Schema?”, the answer is yes.

If the question is “does this package implement JSON Schema as a standard?”, the answer is no.

A useful rule of thumb is:

- choose JSON Schema when schemas must be shared across tools, languages, or systems
- choose `@samatawy/checks` when validation lives inside your TypeScript application and you want richer runtime behavior

## Suggested Choice

Choose JSON Schema when you need:

- a portable schema format
- integration with schema-driven tools
- schema exchange across services or languages
- keyword-level standards compatibility

Choose `@samatawy/checks` when you need:

- fluent TypeScript-first validation
- custom or async business rules
- decorator-based validation models
- binary and image validation
- i18n-aware messages and coded results
- validated runtime output and optional object hydration