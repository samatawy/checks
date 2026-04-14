import { describe, expect, it } from 'vitest';

import { ObjectStore } from '../src';
import type { QueryableTypeStore } from '../src';

class PersonDto {
    constructor(
        public readonly id: string,
        public readonly name: string,
    ) { }
}

describe('ObjectStore', () => {
    it('delegates typed CRUD operations to the registered per-type store', async () => {
        const records = new Map<string, PersonDto>([
            ['1', new PersonDto('1', 'Ada')],
        ]);

        const personStore: QueryableTypeStore<PersonDto, string, { id: string; name: string }, { name?: string }, { nameStartsWith?: string }> = {
            keyOf(person) {
                return person.id;
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

        const store = new ObjectStore().registerTypeStore(PersonDto, personStore);

        await expect(store.fetch(PersonDto, '1')).resolves.toEqual(new PersonDto('1', 'Ada'));
        await expect(store.list(PersonDto)).resolves.toEqual({
            items: [new PersonDto('1', 'Ada')],
            meta: { total: 1 },
        });
        await expect(store.query(PersonDto, { nameStartsWith: 'A' })).resolves.toEqual({
            items: [new PersonDto('1', 'Ada')],
            meta: { total: 1 },
        });

        const created = await store.create(PersonDto, { id: '2', name: 'Grace' });
        expect(created).toEqual(new PersonDto('2', 'Grace'));

        const updated = await store.update(PersonDto, created, { name: 'Grace Hopper' });
        expect(updated).toEqual(new PersonDto('2', 'Grace Hopper'));

        await expect(store.delete(PersonDto, '2')).resolves.toBe(true);
        await expect(store.fetch(PersonDto, '2')).resolves.toBeUndefined();
    });

    it('throws when a type store is missing', () => {
        const store = new ObjectStore();

        expect(() => store.getTypeStore(PersonDto)).toThrow(/No type store is registered/);
    });

    it('throws when query is called on a store without query support', async () => {
        const store = new ObjectStore().registerTypeStore(PersonDto, {
            keyOf(person) {
                return person.id;
            },
            async fetch() {
                return undefined;
            },
            async list() {
                return { items: [] };
            },
            async create(input: PersonDto) {
                return input;
            },
            async update(existing: PersonDto) {
                return existing;
            },
            async delete() {
                return true;
            },
        });

        await expect(store.query(PersonDto, {})).rejects.toThrow(/does not support query/);
    });
});