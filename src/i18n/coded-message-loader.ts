import { readFile } from 'node:fs/promises';

import { CodedMessageCatalog } from './result.catalog';
import type { ResultCodeDefinition, TranslationMap } from '../types';

type CodedMessageFile = Record<string, ResultCodeDefinition>;

export async function loadCodedMessagesFromFile(
    catalog: CodedMessageCatalog,
    filePath: string,
): Promise<CodedMessageCatalog> {
    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new TypeError(`Coded message file ${filePath} must contain a JSON object`);
    }

    applyFileDefinitions(catalog, parsed as CodedMessageFile);
    return catalog;
}

function applyFileDefinitions(
    catalog: CodedMessageCatalog,
    definitions: CodedMessageFile,
): void {
    for (const [code, definition] of Object.entries(definitions)) {
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            throw new TypeError(`Coded message entry for code ${code} must contain a JSON object of result levels`);
        }

        const existing = catalog.getDefinition(code) ?? {};

        const merged: ResultCodeDefinition = {
            hint: mergeLevelDefinition(existing.hint, definition.hint),
            warn: mergeLevelDefinition(existing.warn, definition.warn),
            err: mergeLevelDefinition(existing.err, definition.err),
        };

        catalog.register(code, merged);
    }
}

function mergeLevelDefinition(
    existing: string | TranslationMap | undefined,
    incoming: string | TranslationMap | undefined,
): string | TranslationMap | undefined {
    if (incoming === undefined) {
        return existing;
    }

    const translations: TranslationMap = typeof existing === 'string'
        ? { en: existing }
        : { ...(existing ?? {}) };

    if (typeof incoming === 'string') {
        translations.en = incoming;
        return translations;
    }

    for (const [language, value] of Object.entries(incoming)) {
        translations[language] = value;
    }

    return translations;
}