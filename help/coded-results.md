---
title: Coded Message Catalog
group: Guides
category: Advanced
---

# Coded Message Catalog

This guide covers the optional result-code layer.

Use it when you want validators to emit stable codes and only resolve the final text when you build the result output. If you only need inline `err`, `warn`, or `hint` messages, you can skip this page.

## Why Use Codes

Codes are useful when:

- multiple services need the same validation semantics with different display languages
- you want stable identifiers for analytics, logging, or downstream handling
- you want to separate rule logic from final display text
- the same code should emit more than one level, such as both a `hint` and an `err`

## Core Exports

The coded-result API uses:

- `CodedMessageCatalog`
- `CodedMessageCatalog.global`
- `ICodedMessageCatalog`
- `ResultCode`
- `ResultCodeDefinition`

## Result Catalog Shape

```ts
type ResultCode = string | number;

interface ResultCodeDefinition {
  hint?: string | Record<string, string>;
  warn?: string | Record<string, string>;
  err?: string | Record<string, string>;
}
```

Each level is optional. A single code can define one level or several levels.

If a level is declared as a single string, the catalog stores it as the English translation. These two registrations are equivalent:

```ts
catalog.register('person.name.missing', {
  err: 'Name is required'
});

catalog.register('person.name.missing', {
  err: {
    en: 'Name is required'
  }
});
```

Language maps are plain key-value objects. The package looks up the requested language first and then falls back to `default` when present. If no translation matches, the validator falls back to the original generated validator message.

## Global Catalog

Use the shared catalog when one process-wide registry is sufficient.

```ts
import { CodedMessageCatalog, FieldCheck } from '@samatawy/checks';

CodedMessageCatalog.global.register('person.name.missing', {
  hint: {
    en: 'Add the legal full name when available',
    de: 'Ergaenze den vollstaendigen Namen, wenn verfuegbar'
  },
  err: {
    en: 'Name is required',
    de: 'Name ist erforderlich'
  }
});

const result = new FieldCheck('name', {}).required({
  code: 'person.name.missing'
}).result({ language: 'de' });

console.log(result.code);
console.log(result.hint);
console.log(result.err);
```

Expected result shape:

```json
{
  "field": "name",
  "valid": false,
  "code": "person.name.missing",
  "hint": "Ergaenze den vollstaendigen Namen, wenn verfuegbar",
  "err": "Name ist erforderlich"
}
```

## Scoped Catalog Instances

Use a separate `CodedMessageCatalog` instance when different modules or tenants should not share the same registry.

```ts
import { CodedMessageCatalog, FieldCheck } from '@samatawy/checks';

const catalog = new CodedMessageCatalog();

catalog.register('person.name.missing', {
  warn: {
    en: 'Name is missing',
    de: 'Name fehlt'
  }
});

const result = new FieldCheck('name', {}).required({
  code: 'person.name.missing',
  catalog
}).result({
  language: 'de',
  catalog
});
```

## Translation Happens At Result Time

Checks keep the code while rules are being composed. Translation is applied when you call `result(...)`.

If final result formatting runs without an explicit language, the catalog resolves coded messages using English by default.

That matters because the same check output can be formatted in more than one language:

```ts
const check = new FieldCheck('name', {}).required({
  code: 'person.name.missing'
});

const german = check.result({ language: 'de' });
const english = check.result({ language: 'en' });
```

## Fallback Behavior

If a code exists in the catalog but the requested language does not, the package falls back to the original generated validator text for that level.

```ts
import { CodedMessageCatalog, FieldCheck } from '@samatawy/checks';

CodedMessageCatalog.global.register('person.name.missing', {
  err: {
    en: 'Name is required'
  }
});

const check = new FieldCheck('name', {}).required({
  code: 'person.name.missing'
});

const english = check.result({ language: 'en' });
const french = check.result({ language: 'fr' });
```

Here:

- `english.err` is `Name is required`
- `french.err` falls back to `Field name is required`
- both results still expose `code: 'person.name.missing'`

## Localized Results In Nested Object Or Array Output

Codes also survive inside nested object and array results.

```ts
import { CodedMessageCatalog, ObjectCheck } from '@samatawy/checks';

CodedMessageCatalog.global.register('children.minor', {
  err: {
    en: 'All children must be minors'
  }
});

const check = await ObjectCheck.for({
  children: [{ age: 26 }]
}).check(person => [
  person.optional('children').array().isTrueEach(child => {
    if (child.age !== undefined && child.age >= 18) {
      return false;
    }
    return true;
  }, { code: 'children.minor' })
]);

const result = check.result({
  raw: true,
  flattened: true,
  language: 'en'
}) as any;

console.log(result.raw.results[0].results[0].code);
console.log(result.errors);
```

## Catalog Operations

Available `CodedMessageCatalog` methods:

- `register(code, definition)` adds or replaces one code
- `registerAll(source)` copies codes from another catalog
- `getDefinition(code)` returns a cloned definition
- `getResult(code, language?)` returns a resolved `SingleResult`
- `listCodes()` returns the configured codes
- `clear()` empties the catalog
- `configure(source)` replaces the current catalog contents from another catalog

## When Not To Use It

Do not add codes just because the feature exists.

Inline messages are usually enough when:

- validation only runs in one UI or one service
- no stable identifier is needed downstream
- translation is out of scope
- rule-level messages are easier to maintain close to the check itself