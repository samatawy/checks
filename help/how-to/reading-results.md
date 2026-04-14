---
title: Reading Results
group: Guides
category: Common Tasks
---

# Reading Results

Use `result(options?)` to select the output shape that best fits your application code.

## Choose A Result Shape

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  profile: {},
  tags: []
}).check(input => [
  input.required('profile').object().notEmpty(),
  input.required('tags').array().notEmpty()
]);

console.log(check.result({ language: 'en' }));
console.log(check.result({ flattened: true, language: 'en' }));
console.log(check.result({ nested: true, language: 'en' }));
console.log(check.result({ validated: 'partial', language: 'en' }));
console.log(check.result({ validated: 'strict', language: 'en' }));
console.log(check.result({ raw: true, nested: true, flattened: true, language: 'en' }));
```

Use these options as a rule of thumb:

- `language` for the merged nested result tree
- `catalog` when you want result formatting to resolve coded messages through a specific `CodedMessageCatalog` instead of `CodedMessageCatalog.global`
- `flattened: true` when you only need message arrays such as `errors`
- `nested: true` when you want an input-shaped projection under `input`
- `validated: 'partial'` when you want a cloned value with invalid fields or items removed while valid siblings stay
- `validated: 'strict'` when any invalid descendant should remove the whole parent branch from the validated output
- `raw: true` when you also want the merged internal result tree exposed under `raw`

`validated` is built from the normalized input value after coercions such as `trim()` or tolerant boolean and number parsing. It is intended as a runtime-safe filtered clone, not as inferred compile-time typing.

## Use Localized Results Only When Needed

If you need stable codes and translation catalogs, read [Coded Message Catalog](coded-results.md).

That page covers:

- `CodedMessageCatalog.global`
- separate `CodedMessageCatalog` instances
- `code` on results
- fallback behavior when a translation is missing