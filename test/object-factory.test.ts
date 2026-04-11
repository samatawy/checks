import { describe, expect, it } from 'vitest';

import { ObjectCheck, ObjectFactory } from '../src';

class PersonRecord {
    public name: string;

    public title?: string;

    constructor(name: string, title?: string) {
        this.name = name;
        this.title = title;
    }

    static async validateUpdate(existing: PersonRecord, input: unknown): Promise<ObjectCheck> {
        return ObjectCheck.for(input)
            .updating(existing)
            .check(root => [
                root.optional('name').string().immutable(),
                root.optional('title').string()
            ]);
    }

    static updateFrom(existing: PersonRecord, input: any): PersonRecord {
        return new PersonRecord(
            input.name ?? existing.name,
            input.title ?? existing.title,
        );
    }
}

describe('object factory', () => {
    it('updates a valid instance through an updatable class', async () => {
        const existing = new PersonRecord('Ada', 'Engineer');

        const updated = await ObjectFactory.update(existing, { title: 'Architect' }, PersonRecord);

        expect(updated.valid).toBe(true);
        expect(updated.instance).toEqual(new PersonRecord('Ada', 'Architect'));
    });

    it('returns validation errors instead of updating when validateUpdate fails', async () => {
        const existing = new PersonRecord('Ada', 'Engineer');

        const updated = await ObjectFactory.update(existing, { name: 'Grace' }, PersonRecord);
        const result = updated.result({ flattened: true }) as any;

        expect(updated.valid).toBe(false);
        expect(updated.instance).toBeUndefined();
        expect(result.errors).toContain('Field name is immutable and cannot be updated from "Ada" to "Grace"');
    });

    it('returns the updated instance from updateOrThrow when validation succeeds', async () => {
        const existing = new PersonRecord('Ada', 'Engineer');

        const updated = await ObjectFactory.updateOrThrow(existing, { title: 'Architect' }, PersonRecord);

        expect(updated).toEqual(new PersonRecord('Ada', 'Architect'));
    });

    it('returns errors from updateOrErrors when update validation fails', async () => {
        const existing = new PersonRecord('Ada', 'Engineer');

        const updated = await ObjectFactory.updateOrErrors(existing, { name: 'Grace' }, PersonRecord);

        expect(updated.instance).toBeUndefined();
        expect(updated.errors).toContain('Field name is immutable and cannot be updated from "Ada" to "Grace"');
    });
});