---
title: Data Updates
group: Guides
category: Common Tasks
---

# Data Updates

Use these patterns when validation depends on both incoming update data and an existing value.

All update-aware checks start by supplying the previous value with `updating(...)`.

Update validation is patch-based. Validate the incoming input only, then let update-aware methods compare that input against the previous value from `updating(...)`.

## Start With updating

Use `updating(previous)` at the root of the fluent chain when later checks need access to old values.

```ts
import { ObjectCheck } from '@samatawy/checks';

const previous = {
  name: 'Ada',
  role: 'admin'
};

const input = {
  role: 'editor'
};

const check = await ObjectCheck.for(input)
  .updating(previous)
  .check(root => [
    root.optional('role').string()
  ]);

const result = check.result({ flattened: true });
```

If a field is omitted from the incoming patch, update-specific rules for that field do not run.

## Use canUpdate For Custom Transition Rules

Use `canUpdate(...)` when the allowed change depends on both the previous and new value.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({ role: 'editor' })
  .updating({ role: 'admin' })
  .check(root => [
    root.optional('role').string().canUpdate((oldValue, newValue) => {
      return !(oldValue === 'admin' && newValue !== 'admin');
    }, {
      err: 'Role cannot be downgraded from admin'
    })
  ]);

const result = check.result({ flattened: true });
```

That same pattern works for nested fields and array items because `updating(...)` flows down through child checkers.

## Use immutable For No-Change Fields

Use `immutable()` when a field or value may already exist but must not be changed by the current patch.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({ name: 'Grace' })
  .updating({ name: 'Ada' })
  .check(root => [
    root.optional('name').string().immutable()
  ]);

const result = check.result({ flattened: true });
```

Because update validation is patch-based, `immutable()` only runs when the current input supplies that field.

## Use canAdd And canDelete On Arrays

Use `canAdd(...)` when each newly added item must satisfy a transition rule.

Use `canDelete(...)` when each removed item must satisfy a removal rule.

```ts
import { ObjectCheck } from '@samatawy/checks';

const check = await ObjectCheck.for({ tags: ['admin', 'editor'] })
  .updating({ tags: ['editor', 'viewer'] })
  .check(root => [
    root.required('tags').array()
      .canAdd((array, item) => item !== 'admin', {
        err: 'Admin tag cannot be added'
      })
      .then(tags => tags.canDelete((array, item) => item !== 'viewer', {
        err: 'Viewer tag cannot be removed'
      }))
  ]);

const result = check.result({ flattened: true });
```

`canAdd(...)` receives the current array and each added item.

`canDelete(...)` receives the previous array and each deleted item.

Both methods compare current and previous arrays with duplicate-aware matching, so repeated values are handled individually.

## Use ObjectFactory For Validated Updates

Use `ObjectFactory.update(...)` when a class owns both validation and hydration for update workflows.

```ts
import { ObjectCheck, ObjectFactory } from '@samatawy/checks';

class PersonDto {
  constructor(
    public readonly name: string,
    public readonly title?: string,
  ) {}

  static async validateUpdate(existing: PersonDto, input: unknown): Promise<ObjectCheck> {
    return ObjectCheck.for(input)
      .updating(existing)
      .check(root => [
        root.optional('name').string().immutable(),
        root.optional('title').string().canUpdate((oldValue, newValue) => {
          return !(oldValue === 'Lead' && newValue === 'Intern');
        }, {
          err: 'Lead title cannot be downgraded directly to Intern'
        })
      ]);
  }

  static updateFrom(existing: PersonDto, input: any): PersonDto {
    return new PersonDto(
      input.name ?? existing.name,
      input.title ?? existing.title,
    );
  }
}

const existing = new PersonDto('Ada', 'Lead');

const updated = await ObjectFactory.update(
  existing,
  { title: 'Architect' },
  PersonDto,
);

if (!updated.valid) {
  console.log(updated.result({ flattened: true }));
} else {
  console.log(updated.instance);
}
```

## Choose The Update Helper That Fits

Use `ObjectFactory.update(...)` when you want the full factory result object.

Use `ObjectFactory.updateOrThrow(...)` when invalid update input should raise an exception.

```ts
const existing = new PersonDto('Ada', 'Lead');

const updated = await ObjectFactory.updateOrThrow(existing, { title: 'Architect' }, PersonDto);
```

Use `ObjectFactory.updateOrErrors(...)` when you want either `{ instance }` or `{ errors }` without throwing.

```ts
const existing = new PersonDto('Ada', 'Lead');

const updated = await ObjectFactory.updateOrErrors(existing, { name: 'Grace' }, PersonDto);

if (updated.errors) {
  console.log(updated.errors);
} else {
  console.log(updated.instance);
}
```