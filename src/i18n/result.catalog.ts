import type { IResultCatalog, ResultCode, ResultCodeDefinition, TranslationMap, SingleResult } from '../checks/types';

// Internal representation of result code definitions with translation maps
interface NormalizedResultCodeDefinition {

    hint?: TranslationMap;

    warn?: TranslationMap;

    err?: TranslationMap;
}

export class ResultCatalog implements IResultCatalog {

    public static readonly global = new ResultCatalog();

    private readonly entries = new Map<string, NormalizedResultCodeDefinition>();

    constructor(source?: IResultCatalog) {
        if (source) {
            this.configure(source);
        }
    }

    public configure(source: IResultCatalog): this {
        this.clear();
        return this.registerAll(source);
    }

    public register(code: ResultCode, definition: ResultCodeDefinition): this {
        if (!code || !definition) {
            return this;
        }
        this.entries.set(this.normalizeCode(code), this.normalizeDefinition(definition));
        return this;
    }

    public registerAll(source: IResultCatalog): this {
        for(const code of source.listCodes()) {
            const definition = source.getDefinition(code);
            this.register(code, definition!);
        }
        return this;
    }

    public clear(): this {
        this.entries.clear();
        return this;
    }

    public listCodes(): ResultCode[] {
        return Array.from(this.entries.keys());
    }

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
