import { describe, expect, it } from 'vitest';

import { CachedObjectStore } from '../src/cache/CachedObjectStore';
import type { QueryableCachedTypeStore } from '../src/cache/types';

class PersonDto {
    constructor(
        public readonly id: string,
        public readonly name: string,
    ) { }
}

describe('CachedObjectStore', () => {
    it('returns cached values after the first fetch and populates cache on create, update, list, and delete', async () => {
        const records = new Map<string, PersonDto>([
            ['1', new PersonDto('1', 'Ada')],
            ['2', new PersonDto('2', 'Grace')],
        ]);

        let fetchCount = 0;

        const personStore: QueryableCachedTypeStore<PersonDto, string, { id: string; name: string }, { name?: string }, { nameStartsWith?: string }> = {
            keyOf(person) {
                return person.id;
            },
            async fetch(id: string) {
                fetchCount += 1;
                return records.get(id);
            },
            async list() {
                return {
                    items: Array.from(records.values()),
                    meta: { total: records.size },
                };
            },
            async query(query: { nameStartsWith?: string }) {
                const items = Array.from(records.values()).filter(person => {
                    return query.nameStartsWith ? person.name.startsWith(query.nameStartsWith) : true;
                });

                return {
                    items,
                    meta: { total: items.length },
                };
            },
            async create(input: { id: string; name: string }) {
                const person = new PersonDto(input.id, input.name);
                records.set(person.id, person);
                return person;
            },
            async update(existing: PersonDto, input: { name?: string }) {
                const person = new PersonDto(existing.id, input.name ?? existing.name);
                records.set(person.id, person);
                return person;
            },
            async delete(id: string) {
                return records.delete(id);
            },
        };

        const store = new CachedObjectStore().registerTypeStore(PersonDto, personStore);

        await expect(store.fetch(PersonDto, '1')).resolves.toEqual(new PersonDto('1', 'Ada'));
        await expect(store.fetch(PersonDto, '1')).resolves.toEqual(new PersonDto('1', 'Ada'));
        expect(fetchCount).toBe(1);

        const created = await store.create(PersonDto, { id: '3', name: 'Linus' });
        expect(store.getCached(PersonDto, '3')).toEqual(created);

        const listed = await store.list(PersonDto);
        expect(listed.items).toHaveLength(3);
        expect(store.getCached(PersonDto, '2')).toEqual(new PersonDto('2', 'Grace'));

        const queried = await store.query(PersonDto, { nameStartsWith: 'A' });
        expect(queried.items).toEqual([new PersonDto('1', 'Ada')]);
        expect(store.getCached(PersonDto, '1')).toEqual(new PersonDto('1', 'Ada'));

        const updated = await store.update(PersonDto, created, { name: 'Linus Torvalds' });
        expect(store.getCached(PersonDto, '3')).toEqual(updated);

        await expect(store.delete(PersonDto, '3')).resolves.toBe(true);
        expect(store.getCached(PersonDto, '3')).toBeUndefined();

        store.cache.set(PersonDto, 'manual', new PersonDto('manual', 'Cached'));
        expect(store.getCached(PersonDto, 'manual')).toEqual(new PersonDto('manual', 'Cached'));
    });

    it('can skip query caching and respect canCache for returned items', async () => {
        const records = new Map<string, PersonDto>([
            ['1', new PersonDto('1', 'Ada')],
            ['2', new PersonDto('2', 'Grace')],
            ['3', new PersonDto('3', 'Hidden')],
        ]);

        const personStore: QueryableCachedTypeStore<PersonDto, string, { id: string; name: string }, { name?: string }, { nameStartsWith?: string }> = {
            keyOf(person) {
                return person.id;
            },
            canCache(person) {
                return person.name !== 'Hidden';
            },
            async fetch(id: string) {
                return records.get(id);
            },
            async list() {
                return {
                    items: Array.from(records.values()),
                    meta: { total: records.size },
                };
            },
            async query(query: { nameStartsWith?: string }) {
                const items = Array.from(records.values()).filter(person => {
                    return query.nameStartsWith ? person.name.startsWith(query.nameStartsWith) : true;
                });

                return {
                    items,
                    meta: { total: items.length },
                };
            },
            async create(input: { id: string; name: string }) {
                const person = new PersonDto(input.id, input.name);
                records.set(person.id, person);
                return person;
            },
            async update(existing: PersonDto, input: { name?: string }) {
                const person = new PersonDto(existing.id, input.name ?? existing.name);
                records.set(person.id, person);
                return person;
            },
            async delete(id: string) {
                return records.delete(id);
            },
        };

        const store = new CachedObjectStore().registerTypeStore(PersonDto, personStore);

        await store.query(PersonDto, { nameStartsWith: 'A' }, { cache: false });
        expect(store.getCached(PersonDto, '1')).toBeUndefined();

        await store.query(PersonDto, {});
        expect(store.getCached(PersonDto, '1')).toEqual(new PersonDto('1', 'Ada'));
        expect(store.getCached(PersonDto, '2')).toEqual(new PersonDto('2', 'Grace'));
        expect(store.getCached(PersonDto, '3')).toBeUndefined();
    });
});