---
title: Composite Checks
group: Guides
category: Common Tasks
---

# Composite Checks

Use these helpers when one validator needs to combine several rule branches.

## When To Use check, checkEach, and allOf

Use `check(...)` when you want to attach ordinary nested object or array rules.

Use `checkEach(...)` when you want to run ordinary rules for each array item.

Use `allOf(...)` when you want JSON-Schema-style naming for “all returned checks must pass” inside one composed branch. In practice, `allOf(...)` is an alias for the same grouped behavior as `check(...)` on `ObjectCheck` and `ArrayCheck`, and a grouped wrapper on `FieldCheck` and `ArrayItemCheck`.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  profile: {
    name: 'Ada',
    age: 37
  }
}).check(root => [
  root.required('profile').object().allOf(profile => [
    profile.required('name').string().minLength(2),
    profile.required('age').number().atLeast(18)
  ])
]);
```

If you do not need JSON-Schema-style naming for an “all checks must pass” group, plain `check(...)` is still the most direct tool on objects and arrays. `checkEach(...)` remains the array-item entry point when you need to validate each item individually.

## Use anyOf On Objects

Use `anyOf(...)` when more than one rule shape is acceptable and at least one branch may pass.

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

Valid `anyOf(...)` branches are replayed on the real object, so mutations such as `trim()` or tolerant parsing still affect the original input.

## Use oneOf When Exactly One Branch Must Win

Use `oneOf(...)` when several branches are possible but exactly one must pass.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  value: '37'
}).check(root => [
  root.required('value').oneOf([
    field => [field.number({ tolerant: true }).greaterThan(10)],
    field => [field.string().minLength(2)]
  ])
]);

const result = check.result({ flattened: true, language: 'en' });
console.log(result.errors);
```

That pattern is useful when overlapping rule branches would be a problem and should be reported explicitly.

## Use not When A Branch Must Fail

Use `not(...)` when one specific rule shape must not match.

```ts
import { ObjectCheck } from '@samatawy/checks';

const input = {
  profile: {
    name: '  Ada  '
  }
};

const check = await ObjectCheck.for(input).check(root => [
  root.required('profile').object().not(profile => [
    profile.required('name').string().trim().minLength(3)
  ])
]);

const result = check.result({ flattened: true, language: 'en' });
console.log(result.errors);
console.log(input.profile.name);
```

Unlike `anyOf(...)` and `oneOf(...)`, `not(...)` runs its branch on isolated data and never replays mutations onto the original input.

## Rule Of Thumb

- `allOf(fn)` takes one callback returning the checks that must all pass
- `anyOf([branch1, branch2])` takes an array of branch functions and succeeds when one or more branches pass
- `oneOf([branch1, branch2])` takes an array of branch functions and succeeds only when exactly one branch passes
- `not(fn)` takes one callback returning the checks that must fail

## Field-Level Composition

`FieldCheck` also supports `allOf(...)`, `anyOf(...)`, `oneOf(...)`, and `not(...)` when one field can satisfy more than one rule shape.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({
  value: '37'
}).check(root => [
  root.required('value').allOf(field => [
    field.number({ tolerant: true }).greaterThan(10),
    field.equals(37)
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
    item.oneOf([
      entry => [entry.string().trim().minLength(2)],
      entry => [entry.number({ tolerant: true }).greaterThan(10)]
    ])
  ])
]);
```