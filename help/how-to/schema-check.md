---
title: SchemaCheck
group: Guides
category: Common Tasks
---

# SchemaCheck

Use `SchemaCheck` when you already have a JSON-Schema-like object and want to validate input against the supported subset instead of writing fluent rules directly.

`SchemaCheck` is intentionally limited to a reviewable subset. It currently expects the root schema to describe an object.

The current API has three separate steps:

- `check(input)` builds and runs the underlying `ObjectCheck`
- `result(options?)` reads the last cached result after `check(...)` or `checkResult(...)`
- `checkResult(input, options?)` runs the schema and returns the formatted result directly

## Validate Against An Inline Schema Object

```ts
import { SchemaCheck } from '@samatawy/checks';

const schema = {
  type: 'object',
  required: ['name', 'age'],
  properties: {
    name: {
      type: 'string',
      minLength: 2
    },
    age: {
      type: 'number',
      minimum: 18
    }
  }
};

const schemaCheck = SchemaCheck.from(schema);

const result = await schemaCheck.checkResult({
  name: 'Ada',
  age: 37
}, {
  language: 'en'
});

console.log(result.valid);
```

Use `SchemaCheck.from(schema)` when the schema already exists as a TypeScript object in your application.

If you need the underlying fluent validator, call `await schemaCheck.check(input)` instead and work with the returned `ObjectCheck`.

## Validate Against A JSON File In Node

```ts
import { loadSchemaCheckFromFile } from '@samatawy/checks/node';

const schemaCheck = await loadSchemaCheckFromFile('./person.schema.json');

const result = await schemaCheck.checkResult({
  name: 'Ada',
  age: 37
}, {
  flattened: true,
  language: 'en'
});

console.log(result.errors);
```

Use `loadSchemaCheckFromFile(path)` from `@samatawy/checks/node` when the schema lives in a JSON file on disk in a Node runtime.

## Use Supported Object And Array Keywords

The most common supported keywords are:

- object structure: `type`, `properties`, `required`, `additionalProperties: false`
- arrays: `items`, `minItems`, `maxItems`, `contains`, `minContains`, `maxContains`
- strings: `minLength`, `maxLength`, `pattern`, `format`, `enum`, `const`
- numbers: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
- composition: `allOf`, `anyOf`, `oneOf`, `not`

Example:

```ts
import { SchemaCheck } from '@samatawy/checks';

const schema = {
  type: 'object',
  required: ['tags'],
  properties: {
    tags: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
        minLength: 2
      }
    }
  }
};

const result = await SchemaCheck.from(schema).checkResult({
  tags: ['ab', 'cd']
}, {
  validated: 'partial',
  language: 'en'
});

console.log(result.valid);
console.log(result.validated);
```

## Use Composition Keywords

`SchemaCheck` also supports the current composition subset.

```ts
import { SchemaCheck } from '@samatawy/checks';

const schema = {
  type: 'object',
  required: ['value'],
  properties: {
    value: {
      oneOf: [
        { type: 'string', minLength: 2 },
        { type: 'number', minimum: 10 }
      ]
    }
  }
};

const result = await SchemaCheck.from(schema).checkResult({
  value: 'ok'
}, {
  language: 'en'
});

console.log(result.valid);
```

Use `anyOf`, `oneOf`, and `not` when you want the schema to express alternatives or exclusions in the same way the fluent API now can.

## About `contains` And Related Array Keywords

In JSON Schema, `contains` is a keyword, not a method. It means an array is valid when at least one item matches the nested subschema.

Example intent:

```json
{
  "type": "array",
  "contains": {
    "type": "string",
    "minLength": 3
  }
}
```

That schema means the array must contain at least one string item whose length is 3 or more.

The closely related keywords are:

- `minContains`: the minimum number of array items that must match the `contains` subschema
- `maxContains`: the maximum number of array items that may match the `contains` subschema
- `prefixItems`: positional or tuple-style validation where item 0, item 1, and so on can each have a different schema
- `unevaluatedItems`: rules for array items that were not already covered by `items`, `prefixItems`, or composition branches

These keywords are useful when array validation depends on matching counts or on the position of items, not just on applying one schema to every item.

`SchemaCheck` now supports `contains`, `minContains`, and `maxContains`.

`SchemaCheck` still does not implement `prefixItems` or `unevaluatedItems`. If one of those keywords appears in the input schema, `SchemaCheck` throws an unsupported-keyword error instead of partially interpreting it.

## Choose Between `checkResult()` And `result()`

`SchemaCheck.result(options?)` and `SchemaCheck.checkResult(input, options?)` accept the same result options as the fluent validators.

```ts
const schemaCheck = SchemaCheck.from(schema);

const output = await schemaCheck.checkResult(input, {
  flattened: true,
  validated: 'partial',
  language: 'en'
});

console.log(output.errors);
console.log(output.validated);
```

If you already called `check(input)` or `checkResult(input, options?)`, you can read the cached result again without re-running validation:

```ts
await schemaCheck.check(input);

const output = schemaCheck.result({
  flattened: true,
  language: 'en'
});

console.log(output.errors);
```

That means you can still choose nested results, flattened messages, or validated output depending on the caller.

## Current Limits

`SchemaCheck` does not implement the full JSON Schema standard.

Important current limits include:

- the root schema must describe an object
- `$ref`, `$defs`, and related reference features are not supported
- `if` / `then` / `else` are not supported
- array keywords such as `prefixItems` and `unevaluatedItems` are not supported
- tuple arrays such as `prefixItems` are not supported
- pattern-based property keywords such as `patternProperties` are not supported

For the broader standards comparison, see [JSON Schema Comparison](../reference/json-schema-comparison.md).