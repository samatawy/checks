---
title: State Store
group: Guides
category: State
---

# State Store

This guide covers the package's keyed state-management helper.

Use `StateStore` when you want a small in-process state registry with:

- keyed values
- subscriptions by key
- derived values with dependencies
- item-level subscriptions for arrays, sets, or custom collection-like values

It is intentionally lightweight. It is useful for application state, UI-facing state, derived counters, filtered views, and other cases where you want a typed dependency graph without adding a larger state framework.

## Simple Example

Start with one direct value and one derived value.

```ts
import { StateStore } from '@samatawy/checks';

const state = new StateStore();

state.define<number>('count', { initialValue: 1 });
state.define<number>('doubleCount', {
  dependencies: [{ key: 'count' }],
  derive(store) {
    return (store.get<number>('count') ?? 0) * 2;
  },
});

state.subscribe<number>('doubleCount', change => {
  console.log('doubleCount changed to', change.value);
});

state.set('count', 3);

console.log(state.get('count')); // 3
console.log(state.get('doubleCount')); // 6
```

What happens here:

- `count` is a normal keyed value
- `doubleCount` depends on `count`
- changing `count` recomputes `doubleCount`
- subscribers for `doubleCount` receive one change object with `previous`, `value`, and `reason`

## More Detailed Example

This example shows a small people directory with:

- one base collection state
- one derived count
- one derived filtered collection
- key-level subscriptions
- item-level subscriptions on the filtered people list

```ts
import { StateStore } from '@samatawy/checks';

class PersonDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly active: boolean,
  ) {}
}

const state = new StateStore();

state.define<PersonDto[]>('people', {
  initialValue: [
    new PersonDto('1', 'Ada', true),
    new PersonDto('2', 'Grace', false),
  ],
  collection: {
    keyOf(person) {
      return person.id;
    },
  },
});

state.define<PersonDto[]>('activePeople', {
  dependencies: [{ key: 'people' }],
  derive(store) {
    return (store.get<PersonDto[]>('people') ?? []).filter(person => person.active);
  },
  collection: {
    keyOf(person) {
      return person.id;
    },
  },
});

state.define<number>('activePeopleCount', {
  dependencies: [{ key: 'activePeople' }],
  derive(store) {
    return store.get<PersonDto[]>('activePeople')?.length ?? 0;
  },
});

state.subscribe<number>('activePeopleCount', change => {
  console.log('active count', change.previous, '->', change.value);
});

state.subscribeItem<PersonDto, string>('activePeople', change => {
  console.log('active person change', change.itemKey, change.kind);
});

state.set('people', [
  new PersonDto('1', 'Ada', true),
  new PersonDto('2', 'Grace', true),
  new PersonDto('3', 'Linus', true),
]);
```

After that update:

- `people` changes directly
- `activePeople` is recomputed from `people`
- `activePeopleCount` is recomputed from `activePeople`
- `subscribe('activePeopleCount', ...)` receives the new count
- `subscribeItem('activePeople', ...)` receives per-person item changes such as added or updated records

## Notes

- Use `define(...)` when the key needs metadata such as `initialValue`, `derive(...)`, or `collection`
- Use `subscribe(...)` when you care about the whole keyed value
- Use `subscribeItem(...)` when you care about added, updated, or removed items inside a collection-like value
- Arrays, sets, and maps are inferred automatically for item subscriptions
- For arrays, sets, or maps, you only need `collection.keyOf(...)` when the default item key is not what you want
- For custom collection shapes, provide `collection.items(...)` and usually `collection.keyOf(...)` so the state store knows how to enumerate items and key them

`StateStore` is not a full application framework. It is a small typed helper for local state graphs and subscriptions.