import { describe, expect, it } from 'vitest';

import { ObjectCheck } from '../src';

describe('UUID string checks', () => {
    it('validates UUIDs immediately through the uuid entry points', async () => {
        const valid = await ObjectCheck.for({ id: '550e8400-e29b-41d4-a716-446655440000' }).check(root => [
            root.required('id').uuid()
        ]);

        const invalid = await ObjectCheck.for({ id: 'not-a-uuid' }).check(root => [
            root.required('id').uuid()
        ]);

        expect(valid.result().valid).toBe(true);
        expect((invalid.result({ flattened: true }) as any).errors).toContain('Field id must be a valid UUID');
    });

    it('accepts common UUID versions by default', async () => {
        const validV4 = await ObjectCheck.for({ id: '550e8400-e29b-41d4-a716-446655440000' }).check(root => [
            root.required('id').string().uuid()
        ]);

        const validV7 = await ObjectCheck.for({ id: '018f23c0-9f4a-7b2d-8c12-5f1d2c3b4a5e' }).check(root => [
            root.required('id').string().uuid()
        ]);

        expect(validV4.result().valid).toBe(true);
        expect(validV7.result().valid).toBe(true);
    });

    it('can restrict UUID validation to one version', async () => {
        const valid = await ObjectCheck.for({ id: '550e8400-e29b-41d4-a716-446655440000' }).check(root => [
            root.required('id').string().uuid().version(4)
        ]);

        const invalid = await ObjectCheck.for({ id: '018f23c0-9f4a-7b2d-8c12-5f1d2c3b4a5e' }).check(root => [
            root.required('id').string().uuid().version(4)
        ]);

        expect(valid.result().valid).toBe(true);
        expect((invalid.result({ flattened: true }) as any).errors).toContain('Field id must be a valid UUIDv4');
    });

    it('can allow multiple UUID versions', async () => {
        const valid = await ObjectCheck.for({ id: '018f23c0-9f4a-7b2d-8c12-5f1d2c3b4a5e' }).check(root => [
            root.required('id').string().uuid().version([4, 7])
        ]);

        const invalid = await ObjectCheck.for({ id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' }).check(root => [
            root.required('id').string().uuid().version([4, 7])
        ]);

        expect(valid.result().valid).toBe(true);
        expect((invalid.result({ flattened: true }) as any).errors).toContain(
            'Field id must be a valid UUID matching one of the allowed versions: 4, 7',
        );
    });

    it('rejects unsupported UUID version options', async () => {
        await expect(ObjectCheck.for({ id: '550e8400-e29b-41d4-a716-446655440000' }).check(root => [
            root.required('id').string().uuid().version(9 as any)
        ])).rejects.toThrow('Unsupported UUID version: 9.');
    });

    it('supports the dedicated UUIDCheck entry points', async () => {
        const fieldShortcut = await ObjectCheck.for({ id: '550e8400-e29b-41d4-a716-446655440000' }).check(root => [
            root.required('id').uuid({ version: 4 })
        ]);

        const stringShortcut = await ObjectCheck.for({ id: '01HV6M7YQ7W4L9D6X8Y2P3N5KR' }).check(root => [
            root.required('id').string().ulid()
        ]);

        const validUlid = await ObjectCheck.for({ id: '01ARZ3NDEKTSV4RRFFQ69G5FAV' }).check(root => [
            root.required('id').string().ulid()
        ]);

        expect(fieldShortcut.result().valid).toBe(true);
        expect(stringShortcut.result().valid).toBe(false);
        expect(validUlid.result().valid).toBe(true);
    });

    it('validates ULIDs immediately through the ulid entry points', async () => {
        const valid = await ObjectCheck.for({ id: '01ARZ3NDEKTSV4RRFFQ69G5FAV' }).check(root => [
            root.required('id').ulid()
        ]);

        const invalid = await ObjectCheck.for({ id: '550e8400-e29b-41d4-a716-446655440000' }).check(root => [
            root.required('id').ulid()
        ]);

        expect(valid.result().valid).toBe(true);
        expect((invalid.result({ flattened: true }) as any).errors).toContain('Field id must be a valid ULID');
    });
});