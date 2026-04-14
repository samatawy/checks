import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { CodedMessageCatalog } from '../src';
import {
    loadCodedMessagesFromFile,
    loadSchemaCheckFromFile,
} from '../src/node';

const tempDirectories: string[] = [];

describe('node entrypoint helpers', () => {
    afterEach(async () => {
        await Promise.all(tempDirectories.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
    });

    it('loads coded message translation files from one file into a catalog', async () => {
        const dir = await createTempDir();
        const messages = join(dir, 'messages.json');

        await writeJson(messages, {
            'person.name.missing': {
                err: {
                    en: 'Name is required',
                    de: 'Name ist erforderlich',
                },
                hint: {
                    en: 'Add the legal full name when available',
                    de: 'Ergaenze den vollstaendigen Namen, wenn verfuegbar',
                },
            },
            'person.age.invalid': {
                err: {
                    en: 'Age must be a number',
                    de: 'Alter muss eine Zahl sein',
                },
            },
        });

        const catalog = await loadCodedMessagesFromFile(new CodedMessageCatalog(), messages);

        expect(catalog.getResult('person.name.missing', 'de')).toMatchObject({
            code: 'person.name.missing',
            valid: false,
            hint: 'Ergaenze den vollstaendigen Namen, wenn verfuegbar',
            err: 'Name ist erforderlich',
        });

        expect(catalog.getResult('person.age.invalid', 'en')).toMatchObject({
            code: 'person.age.invalid',
            valid: false,
            err: 'Age must be a number',
        });
    });

    it('merges external translation files into an existing catalog with the same method', async () => {
        const dir = await createTempDir();
        const messages = join(dir, 'messages.de.json');

        await writeJson(messages, {
            'person.name.missing': {
                err: {
                    de: 'Name ist erforderlich',
                },
            },
        });

        const catalog = new CodedMessageCatalog();
        catalog.register('person.name.missing', {
            err: {
                en: 'Name is required',
            },
        });

        await loadCodedMessagesFromFile(catalog, messages);

        expect(catalog.getResult('person.name.missing', 'en')?.err).toBe('Name is required');
        expect(catalog.getResult('person.name.missing', 'de')?.err).toBe('Name ist erforderlich');
    });

    it('supports a file that contains only one language', async () => {
        const dir = await createTempDir();
        const messages = join(dir, 'messages.ar.json');

        await writeJson(messages, {
            'person.name.missing': {
                err: {
                    ar: 'الاسم مطلوب',
                },
            },
        });

        const catalog = await loadCodedMessagesFromFile(new CodedMessageCatalog(), messages);

        expect(catalog.getResult('person.name.missing', 'ar')?.err).toBe('الاسم مطلوب');
    });

    it('treats a plain string level as the english translation by default', async () => {
        const dir = await createTempDir();
        const messages = join(dir, 'messages.en.json');

        await writeJson(messages, {
            'person.age.invalid': {
                err: 'Age must be a number',
            },
        });

        const catalog = await loadCodedMessagesFromFile(new CodedMessageCatalog(), messages);

        expect(catalog.getResult('person.age.invalid', 'en')?.err).toBe('Age must be a number');
    });

    it('still exposes schema file loading through the node entrypoint', async () => {
        const dir = await createTempDir();
        const schemaPath = join(dir, 'person.schema.json');

        await writeJson(schemaPath, {
            type: 'object',
            properties: {
                name: { type: 'string', minLength: 2 },
            },
            required: ['name'],
        });

        const schemaCheck = await loadSchemaCheckFromFile(schemaPath);
        const result = await schemaCheck.checkResult({ name: 'A' });

        expect(result.valid).toBe(false);
    });
});

async function createTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'checks-node-'));
    tempDirectories.push(dir);
    return dir;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}