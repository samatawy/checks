---
title: Composite Checks
group: Guides
category: Common Tasks
---

# Composite Checks

Use these helpers when one validator needs to combine several rule branches.

## Use allOf, anyOf, oneOf, and not On Objects

Use `allOf(...)` when every nested object rule must pass. Use `anyOf(...)` when alternative rule branches are acceptable. Use `oneOf(...)` when exactly one branch should pass. Use `not(...)` when a branch must fail.

```ts
import { ObjectCheck } from '@samatawy/checks';

const input = {
  profile: {
    name: '  Ada  ',
    age: '37'
  }
};

const check = await ObjectCheck.for(input).check(root => [
  root.required('profile').object().anyOf([
    profile => [
      profile.required('name').string().trim().minLength(3)
    ],
    profile => [
      profile.required('age').number({ tolerant: true }).greaterThan(17)
    ]
  ])
]);

const result = check.result({ language: 'en' });

console.log(result.valid);
console.log(input.profile.name);
console.log(input.profile.age);
```

Use this rule of thumb:

- `allOf(fn)` takes one callback returning the checks that must all pass
- `anyOf([branch1, branch2])` takes an array of branch functions and succeeds when one or more branches pass
- `oneOf([branch1, branch2])` takes an array of branch functions and succeeds only when exactly one branch passes
- `not(fn)` takes one callback returning the checks that must fail
- valid `anyOf(...)` and `oneOf(...)` branches are replayed on the real object, so normal mutations such as `trim()` or tolerant parsing still affect the original input
- `not(...)` runs its branch on isolated data and never replays mutations onto the original input

## Field-Level Composition

`FieldCheck` also supports `allOf(...)`, `anyOf(...)`, `oneOf(...)`, and `not(...)` when one field can satisfy more than one rule shape.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  value: '37'
}).check(root => [
  root.required('value').anyOf([
    field => [field.number({ tolerant: true }).greaterThan(10)],
    field => [field.string().minLength(5)]
  ])
]);
```

## Array And Array Item Composition

`ArrayCheck` and `ArrayItemCheck` support the same composition family for whole-array alternatives, per-item alternatives, and negated branches.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  tags: ['  Ada  ', '  Bob  ']
}).check(root => [
  root.required('tags').array().anyOf([
    tags => [tags.checkEach(item => [item.string().trim().minLength(2)])],
    tags => [tags.maxLength(1)]
  ])
]);
```

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  values: ['  Ada  ']
}).check(root => [
  root.required('values').array().checkEach(item => [
    item.anyOf([
      entry => [entry.string().trim().minLength(2)],
      entry => [entry.number().greaterThan(10)]
    ])
  ])
]);
```