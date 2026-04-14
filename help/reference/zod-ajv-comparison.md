---
title: Zod And Ajv Comparison
group: Reference
category: Library Comparison
---

# Zod And Ajv Comparison

This guide compares `@samatawy/checks` with two common TypeScript and JavaScript validation choices: Zod and Ajv.

The short version is:

- use Zod when type inference and schema-as-code ergonomics are the main priority
- use Ajv when JSON Schema interoperability and compiled-schema validation are the main priority
- use `@samatawy/checks` when validation is part of application behavior and you need richer runtime results, update-aware rules, object hydration, or binary checks

## Comparison Table

| Concern | `@samatawy/checks` | Zod | Ajv |
| --- | --- | --- | --- |
| Main style | Fluent validation API with runtime result shaping | Schema-as-code API with strong TypeScript inference | JSON Schema validator and compiler |
| TypeScript-first developer experience | Strong | Very strong | Moderate |
| JSON Schema interoperability | Partial through `SchemaCheck` | Limited conversion-oriented ecosystem support | Strong |
| Async validation | Built in | Supported | Supported |
| Custom business-rule code | Built in through `isTrue(...)`, `canUpdate(...)`, `canAdd(...)`, `canDelete(...)` | Supported through refinements | Supported through custom keywords or custom logic around schemas |
| Update-aware validation against previous values | Built in through `updating(...)`, `immutable()`, and `canUpdate(...)` | Manual | Manual |
| Warnings, hints, and rich result trees | Built in | Not a core concept | Not a core concept |
| Localized coded messages | Built in through `CodedMessageCatalog` | Manual | Manual |
| Validated output projection | Built in through `result({ validated: ... })` | Parse result gives typed data | Validation only; projection is separate |
| Object hydration helpers | Built in through `ObjectFactory` | Manual | Manual |
| Decorator support | Built in | Not a core built-in feature | Not a core built-in feature |
| File and image validation | Built in | Manual | Manual |
| Best fit | Application validation with rich runtime behavior | Type-safe application schemas and DTO parsing | Shared JSON Schema, API contracts, and high-throughput schema validation |

## Where `@samatawy/checks` Is Stronger

Compared with both Zod and Ajv, this package is more opinionated about application-facing validation workflows.

That shows up in features such as:

- flattened, nested, raw, and validated result projections
- hints and warnings in addition to errors
- stable result codes and localized message catalogs
- patch-style update validation against existing values
- object creation and update through `ObjectFactory`
- file and image checks without building those flows from scratch

## Where Zod Is Stronger

Zod is usually a better fit when your main goal is to define a schema once and infer TypeScript types directly from it.

It is especially strong when:

- schema definitions should stay compact and close to inferred types
- `.parse(...)` and `.safeParse(...)` already match the application flow
- you want a very large ecosystem of TypeScript-oriented examples and integrations

## Where Ajv Is Stronger

Ajv is usually a better fit when JSON Schema itself is the real source of truth.

It is especially strong when:

- schemas must be shared across services or languages
- API contracts are already expressed as JSON Schema or OpenAPI-derived schema documents
- validation should run from compiled schemas rather than application-specific fluent rules

## Same Validation In All Three

Suppose you want to validate this shape:

- `name` is required and must be at least 2 characters
- `email` is required and must be a valid email
- `age` is optional but must be at least 18 when present
- extra object fields are not allowed

### `@samatawy/checks`

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for(input)
  .noExtraFields()
  .check(person => [
    person.required('name').string().minLength(2),
    person.required('email').email(),
    person.optional('age').number().atLeast(18),
  ]);

const result = check.result({ flattened: true, language: 'en' });

if (!result.valid) {
  console.log(result.errors);
}
```

### Zod

```ts
import { z } from 'zod';

const PersonSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  age: z.number().min(18).optional(),
}).strict();

const result = PersonSchema.safeParse(input);

if (!result.success) {
  console.log(result.error.issues);
}
```

### Ajv

```ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validate = ajv.compile({
  type: 'object',
  additionalProperties: false,
  required: ['name', 'email'],
  properties: {
    name: { type: 'string', minLength: 2 },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 18 },
  },
});

const valid = validate(input);

if (!valid) {
  console.log(validate.errors);
}
```

## Practical Rule Of Thumb

Choose Zod when the main value is TypeScript schema ergonomics and inferred types.

Choose Ajv when the main value is standards-based schema interoperability and compiled JSON Schema validation.

Choose `@samatawy/checks` when validation is tightly coupled to application behavior and you want richer runtime output than pass/fail plus issue lists.