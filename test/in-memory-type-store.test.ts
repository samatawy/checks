import { describe, expect, it } from 'vitest';

import { CachedObjectStore, InMemoryTypeStore, ObjectStore } from '../src';

class PersonDto {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly title?: string,
    ) { }
}

describe('InMemoryTypeStore', () => {
    it('supports default CRUD, list paging, sorting, and equality-based query filtering', async () => {
        const people = new InMemoryTypeStore<PersonDto>({
            keyOf(person) {
                return person.id;
            },
            initialValues: [
                new PersonDto('2', 'Grace', 'Scientist'),
                new PersonDto('1', 'Ada', 'Architect'),
            ],
        });

        const store = new ObjectStore().registerTypeStore(PersonDto, people);

        await expect(store.fetch(PersonDto, '1')).resolves.toEqual(new PersonDto('1', 'Ada', 'Architect'));
        await expect(store.list(PersonDto, { page: 1, pageSize: 1, sort: { by: 'name', direction: 'asc' } })).resolves.toEqual({
            items: [new PersonDto('1', 'Ada', 'Architect')],
            meta: { page: 1, pageSize: 1, total: 2 },
        });
        await expect(store.query(PersonDto, { title: 'Scientist' })).resolves.toEqual({
            items: [new PersonDto('2', 'Grace', 'Scientist')],
            meta: { page: 1, pageSize: 1, total: 1 },
        });

        const created = await store.create(PersonDto, new PersonDto('3', 'Linus', 'Engineer'));
        expect(created).toEqual(new PersonDto('3', 'Linus', 'Engineer'));

        const updated = await store.update(PersonDto, created, { name: 'Linus Torvalds' });
        expect(updated).toBeInstanceOf(PersonDto);
        expect(updated).toEqual(new PersonDto('3', 'Linus Torvalds', 'Engineer'));

        await expect(store.delete(PersonDto, '3')).resolves.toBe(true);
        await expect(store.fetch(PersonDto, '3')).resolves.toBeUndefined();
    });

    it('supports custom create, update, query, and cache behavior', async () => {
        const people = new InMemoryTypeStore<PersonDto, string, { id: string; name: string; title?: string }, { name?: string }, { nameStartsWith?: string }>({
            ttl_ms: 5_000,
            keyOf(person) {
                return person.id;
            },
            canCache(person) {
                return person.title !== 'Hidden';
            },
            create(input) {
                return new PersonDto(input.id, input.name, input.title);
            },
            update(existing, input) {
                return new PersonDto(existing.id, input.name ?? existing.name, existing.title);
            },
            matchesQuery(person, query) {
                return query.nameStartsWith ? person.name.startsWith(query.nameStartsWith) : true;
            },
            initialValues: [
                new PersonDto('1', 'Ada', 'Architect'),
                new PersonDto('2', 'Secret', 'Hidden'),
            ],
        });

        const store = new CachedObjectStore().registerTypeStore(PersonDto, people);

        await expect(store.query(PersonDto, { nameStartsWith: 'A' })).resolves.toEqual({
            items: [new PersonDto('1', 'Ada', 'Architect')],
            meta: { page: 1, pageSize: 1, total: 1 },
        });
        expect(store.getCached(PersonDto, '1')).toEqual(new PersonDto('1', 'Ada', 'Architect'));

        await store.list(PersonDto);
        expect(store.getCached(PersonDto, '2')).toBeUndefined();

        const created = await store.create(PersonDto, { id: '3', name: 'Grace', title: 'Scientist' });
        expect(created).toEqual(new PersonDto('3', 'Grace', 'Scientist'));

        const updated = await store.update(PersonDto, created, { name: 'Grace Hopper' });
        expect(updated).toEqual(new PersonDto('3', 'Grace Hopper', 'Scientist'));
    });
});