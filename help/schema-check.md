---
title: SchemaCheck
group: Guides
category: Common Tasks
---

# SchemaCheck

Use `SchemaCheck` when you already have a JSON-Schema-like object or JSON file and want to validate input against the supported subset instead of writing fluent rules directly.

`SchemaCheck` is intentionally limited to a reviewable subset. It currently expects the root schema to describe an object.

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

const result = await SchemaCheck.from(schema).result({
  name: 'Ada',
  age: 37
}, {
  language: 'en'
});

console.log(result.valid);
```

Use `SchemaCheck.from(schema)` when the schema already exists as a TypeScript object in your application.

## Validate Against A JSON File

```ts
import { SchemaCheck } from '@samatawy/checks';

const result = await SchemaCheck.fromFile('./person.schema.json').result({
  name: 'Ada',
  age: 37
}, {
  flattened: true,
  language: 'en'
});

console.log(result.errors);
```

Use `SchemaCheck.fromFile(path)` when the schema lives in a JSON file on disk.

## Use Supported Object And Array Keywords

The most common supported keywords are:

- object structure: `type`, `properties`, `required`, `additionalProperties: false`
- arrays: `items`, `minItems`, `maxItems`
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

const result = await SchemaCheck.from(schema).result({
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

const result = await SchemaCheck.from(schema).result({
  value: 'ok'
}, {
  language: 'en'
});

console.log(result.valid);
```

Use `anyOf`, `oneOf`, and `not` when you want the schema to express alternatives or exclusions in the same way the fluent API now can.

## Read The Result The Same Way As Other Checks

`SchemaCheck.result(input, options?)` accepts the same result options as the fluent validators.

```ts
const output = await SchemaCheck.from(schema).result(input, {
  flattened: true,
  validated: 'partial',
  language: 'en'
});

console.log(output.errors);
console.log(output.validated);
```

That means you can still choose nested results, flattened messages, or validated output depending on the caller.

## Current Limits

`SchemaCheck` does not implement the full JSON Schema standard.

Important current limits include:

- the root schema must describe an object
- `$ref`, `$defs`, and related reference features are not supported
- `if` / `then` / `else` are not supported
- tuple arrays such as `prefixItems` are not supported
- pattern-based property keywords such as `patternProperties` are not supported

For the broader standards comparison, see [json-schema-comparison.md](json-schema-comparison.md).