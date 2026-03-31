import type { IResultCatalog, ResultCode, ResultCodeDefinition, TranslationMap, SingleResult } from '../types';

// Internal representation of result code definitions with translation maps
interface NormalizedResultCodeDefinition {

    hint?: TranslationMap;

    warn?: TranslationMap;

    err?: TranslationMap;
}

/**
 * Stores validation result code definitions and resolves localized messages.
 *
 * Use a catalog to keep reusable hint, warning, and error messages separate from
 * individual checks. A catalog can then be supplied through check options or
 * result options when you want messages resolved from result codes.
 */
export class ResultCatalog implements IResultCatalog {

    /**
     * Shared global catalog instance for simple application-wide registration.
     */
    public static readonly global = new ResultCatalog();

    private readonly entries = new Map<string, NormalizedResultCodeDefinition>();

    /**
     * Creates a result catalog and optionally copies entries from an existing catalog.
     */
    constructor(source?: IResultCatalog) {
        if (source) {
            this.configure(source);
        }
    }

    /**
     * Replaces the current entries with the contents of another catalog.
     */
    public configure(source: IResultCatalog): this {
        this.clear();
        return this.registerAll(source);
    }

    /**
     * Registers or replaces a single code definition.
     */
    public register(code: ResultCode, definition: ResultCodeDefinition): this {
        if (!code || !definition) {
            return this;
        }
        this.entries.set(this.normalizeCode(code), this.normalizeDefinition(definition));
        return this;
    }

    /**
     * Registers every code exposed by another catalog.
     */
    public registerAll(source: IResultCatalog): this {
        for(const code of source.listCodes()) {
            const definition = source.getDefinition(code);
            this.register(code, definition!);
        }
        return this;
    }

    /**
     * Removes all registered entries from the catalog.
     */
    public clear(): this {
        this.entries.clear();
        return this;
    }

    /**
     * Returns every registered result code.
     */
    public listCodes(): ResultCode[] {
        return Array.from(this.entries.keys());
    }

    /**
     * Returns the stored definition for a code.
     *
     * The returned object is cloned so callers can read it safely without mutating the catalog.
     */
    public getDefinition(code: ResultCode): ResultCodeDefinition | undefined {
        if (code === null || code === undefined) {
            return undefined;
        }

        const definition = this.entries.get(this.normalizeCode(code));
        if (!definition) {
            return undefined;
        }

        return {
            hint: definition.hint ? { ...definition.hint } : undefined,
            warn: definition.warn ? { ...definition.warn } : undefined,
            err: definition.err ? { ...definition.err } : undefined,
        };
    }

    /**
     * Resolves a code to a localized single result.
     *
     * The selected language is used first, and then `default` is used as a fallback
     * when present in the stored translation map.
     */
    public getResult(code: ResultCode, lang: string = 'en'): SingleResult | undefined {
        const definition = this.entries.get(this.normalizeCode(code));
        if (!definition) {
            return undefined;
        }

        const result: SingleResult = { valid: !definition.err, code };

        if (definition.hint) {
            result.hint = lang && definition.hint[lang] ? definition.hint[lang] : definition.hint['default'] || '';
        }
        if (definition.warn) {
            result.warn = lang && definition.warn[lang] ? definition.warn[lang] : definition.warn['default'] || '';
        }
        if (definition.err) {
            result.err = lang && definition.err[lang] ? definition.err[lang] : definition.err['default'] || '';
        }

        return result;
    }

    private normalizeCode(code: ResultCode): string {
        return String(code);
    }

    private normalizeDefinition(definition: ResultCodeDefinition): NormalizedResultCodeDefinition {
        return {
            hint: this.normalizeLevel(definition.hint),
            warn: this.normalizeLevel(definition.warn),
            err: this.normalizeLevel(definition.err),
        };
    }

    private normalizeLevel(level?: string | TranslationMap): TranslationMap | undefined {
        if (!level) {
            return undefined;
        }

        if (typeof level === 'string') {
            return { en: level };
        }

        return { ...level };
    }
}
