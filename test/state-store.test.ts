import { describe, expect, it } from 'vitest';

import { StateStore } from '../src';
import type { StateChange } from '../src';

class PersonDto {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly active: boolean,
    ) { }
}

describe('StateStore', () => {
    it('notifies keyed state subscribers when values change', () => {
        const store = new StateStore();
        const events: Array<StateChange<number>> = [];

        store.subscribe<number>('count', change => {
            events.push(change);
        });

        store.set('count', 1);
        store.set('count', 2);
        store.delete('count');

        expect(events).toEqual([
            { key: 'count', value: 1, previous: undefined, reason: 'set', sourceKey: undefined },
            { key: 'count', value: 2, previous: 1, reason: 'set', sourceKey: undefined },
            { key: 'count', value: undefined, previous: 2, reason: 'delete', sourceKey: undefined },
        ]);
    });

    it('recomputes dependent states and honors dependency predicates', () => {
        const store = new StateStore();

        store.define<number>('count', { initialValue: 1 });
        store.define<number>('doubleCount', {
            dependencies: [{ key: 'count' }],
            derive(state) {
                return (state.get<number>('count') ?? 0) * 2;
            },
        });
        store.define<number>('evenCount', {
            dependencies: [{
                key: 'count',
                predicate(change) {
                    return typeof change.value === 'number' && change.value % 2 === 0;
                },
            }],
            derive(state) {
                return state.get<number>('count');
            },
        });

        expect(store.get('doubleCount')).toBe(2);
        expect(store.get('evenCount')).toBe(1);

        store.set('count', 3);
        expect(store.get('doubleCount')).toBe(6);
        expect(store.get('evenCount')).toBe(1);

        store.set('count', 4);
        expect(store.get('doubleCount')).toBe(8);
        expect(store.get('evenCount')).toBe(4);
    });

    it('publishes per-item array changes with custom item keys', () => {
        const store = new StateStore();
        const events: Array<{ itemKey: string; kind: string; value: PersonDto | undefined; previous: PersonDto | undefined }> = [];

        store.define<PersonDto[]>('people', {
            collection: {
                keyOf(person) {
                    return person.id;
                },
            },
            initialValue: [
                new PersonDto('1', 'Ada', true),
            ],
        });

        store.subscribeItem<PersonDto, string>('people', change => {
            events.push({
                itemKey: change.itemKey,
                kind: change.kind,
                value: change.value,
                previous: change.previous,
            });
        });

        store.set('people', [
            new PersonDto('1', 'Ada Lovelace', true),
            new PersonDto('2', 'Grace Hopper', false),
        ]);
        store.set('people', [
            new PersonDto('2', 'Grace Hopper', true),
        ]);

        expect(events).toEqual([
            {
                itemKey: '1',
                kind: 'updated',
                value: new PersonDto('1', 'Ada Lovelace', true),
                previous: new PersonDto('1', 'Ada', true),
            },
            {
                itemKey: '2',
                kind: 'added',
                value: new PersonDto('2', 'Grace Hopper', false),
                previous: undefined,
            },
            {
                itemKey: '1',
                kind: 'removed',
                value: undefined,
                previous: new PersonDto('1', 'Ada Lovelace', true),
            },
            {
                itemKey: '2',
                kind: 'updated',
                value: new PersonDto('2', 'Grace Hopper', true),
                previous: new PersonDto('2', 'Grace Hopper', false),
            },
        ]);
    });

    it('supports per-item subscriptions for map states out of the box', () => {
        const store = new StateStore();
        const events: Array<{ itemKey: string; kind: string }> = [];

        store.subscribeItem<string>('labels', change => {
            events.push({ itemKey: String(change.itemKey), kind: change.kind });
        });

        store.set('labels', new Map([
            ['a', 'Ada'],
            ['g', 'Grace'],
        ]));
        store.set('labels', new Map([
            ['g', 'Grace Hopper'],
            ['l', 'Linus'],
        ]));

        expect(events).toEqual([
            { itemKey: 'Ada', kind: 'added' },
            { itemKey: 'Grace', kind: 'added' },
            { itemKey: 'Ada', kind: 'removed' },
            { itemKey: 'Grace', kind: 'removed' },
            { itemKey: 'Grace Hopper', kind: 'added' },
            { itemKey: 'Linus', kind: 'added' },
        ]);
    });

    it('supports per-item subscriptions for set states out of the box', () => {
        const store = new StateStore();
        const events: Array<{ itemKey: string; kind: string }> = [];

        store.subscribeItem<string>('tags', change => {
            events.push({ itemKey: String(change.itemKey), kind: change.kind });
        });

        store.set('tags', new Set(['core', 'reviewed']));
        store.set('tags', new Set(['reviewed', 'published']));

        expect(events).toEqual([
            { itemKey: 'core', kind: 'added' },
            { itemKey: 'reviewed', kind: 'added' },
            { itemKey: 'core', kind: 'removed' },
            { itemKey: 'published', kind: 'added' },
        ]);
    });

    it('rejects circular dependencies', () => {
        const store = new StateStore();

        store.define<number>('a', {
            dependencies: [{ key: 'b' }],
            derive(state) {
                return state.get<number>('b') ?? 0;
            },
        });

        expect(() => {
            store.define<number>('b', {
                dependencies: [{ key: 'a' }],
                derive(state) {
                    return state.get<number>('a') ?? 0;
                },
            });
        }).toThrow(/Circular state dependency detected/);
    });
});