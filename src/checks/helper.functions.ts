import { CodedMessageCatalog } from '../i18n/result.catalog';
import type { CheckOptions, SingleResult, ResultSet, IResult, ResultOptions } from '../types';

const baseTextKey = Symbol('baseText');

type BaseTextSnapshot = Partial<Pick<SingleResult, 'hint' | 'warn' | 'err'>>;

export function defined<T>(value: T | null | undefined): value is NonNullable<T> {
    return value !== null && value !== undefined;
}

export function isPromise(value: any): value is Promise<any> {
    return value
        && typeof value === 'object'
        && typeof value.then === 'function'
        && typeof value.catch === 'function';
}

export function deepEqual(left: unknown, right: unknown): boolean {
    if (left === right) {
        return true;
    }

    if (!defined(left) || !defined(right)) {
        return false;
    }

    if (left instanceof Date && right instanceof Date) {
        return left.getTime() === right.getTime();
    }

    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
            return false;
        }

        for (let index = 0; index < left.length; index++) {
            if (!deepEqual(left[index], right[index])) {
                return false;
            }
        }

        return true;
    }

    if (typeof left !== 'object' || typeof right !== 'object') {
        return false;
    }

    const leftEntries = Object.entries(left as Record<string, unknown>);
    const rightEntries = Object.entries(right as Record<string, unknown>);

    if (leftEntries.length !== rightEntries.length) {
        return false;
    }

    for (const [key, value] of leftEntries) {
        if (!Object.prototype.hasOwnProperty.call(right, key)) {
            return false;
        }

        if (!deepEqual(value, (right as Record<string, unknown>)[key])) {
            return false;
        }
    }

    return true;
}

function toArray(value?: string | string[]): string[] {
    if (!defined(value)) {
        return [];
    }

    return Array.isArray(value) ? [...value] : [value];
}

function appendValue(data: any, key: 'hint' | 'warn' | 'err', value: string | string[]): any {
    const values = toArray(value);
    if (values.length === 0) {
        return data;
    }

    const found = data[key];
    if (!found) {
        data[key] = values.length === 1 ? values[0] : values;
        return data;
    }

    const merged = toArray(found);
    merged.push(...values);
    data[key] = merged.length === 1 ? merged[0] : merged;
    return data;
}

function setBaseText(target: IResult | SingleResult, base: BaseTextSnapshot): void {
    const current = getBaseText(target);
    (target as any)[baseTextKey] = { ...current, ...base };
}

function getBaseText(source: IResult | SingleResult): BaseTextSnapshot {
    return ((source as any)[baseTextKey] ?? {}) as BaseTextSnapshot;
}

function clearBaseText<T extends IResult>(source: T): T {
    delete (source as any)[baseTextKey];

    if (Object.prototype.hasOwnProperty.call(source, 'results')) {
        const set = source as ResultSet;
        if (set.results?.length) {
            set.results = set.results.map(child => clearBaseText(child));
        }
    }

    return source;
}

function resolveCatalog(options?: CheckOptions | ResultOptions) {
    return options?.catalog ?? CodedMessageCatalog.global;
}

function resolveDefaultLevel(options?: CheckOptions): 'hint' | 'warn' | 'err' {
    if (defined(options?.code)) {
        const definition = resolveCatalog(options).getDefinition(options.code);

        if (definition?.err) return 'err';
        if (definition?.warn) return 'warn';
        if (definition?.hint) return 'hint';
    }

    return 'err';
}

function resolveCodeResult(defaultText: string, options?: CheckOptions): SingleResult | undefined {
    if (!defined(options?.code)) {
        return undefined;
    }

    const definition = resolveCatalog(options).getDefinition(options.code);
    if (!definition) {
        return undefined;
    }

    const result: SingleResult = {
        valid: !definition.err,
        code: options.code,
    };

    if (definition.hint) {
        result.hint = defaultText;
    }
    if (definition.warn) {
        result.warn = defaultText;
    }
    if (definition.err) {
        result.err = defaultText;
    }

    setBaseText(result, {
        hint: result.hint,
        warn: result.warn,
        err: result.err,
    });

    return result;
}

export function buildErrorMessage(err: string, options?: CheckOptions): SingleResult {
    let result: SingleResult = { valid: true };

    if (defined(options?.code)) {
        result.code = options.code;
    }

    if (!options) {
        result.err = err;
        result.valid = false;
        return result;
    }

    if (options.hint) appendValue(result, 'hint', options.hint);
    if (options.warn) appendValue(result, 'warn', options.warn);
    if (options.err) appendValue(result, 'err', options.err);

    if (result.hint || result.warn || result.err) {
        setBaseText(result, {
            hint: result.hint,
            warn: result.warn,
            err: result.err,
        });
        result.valid = !defined(result.err);
        return result;
    }

    const coded = resolveCodeResult(err, options);
    if (coded) {
        const merged = { ...result, ...coded } as SingleResult;
        setBaseText(merged, getBaseText(coded));
        return merged;
    }

    appendValue(result, resolveDefaultLevel(options), err);
    setBaseText(result, {
        hint: result.hint,
        warn: result.warn,
        err: result.err,
    });
    result.valid = resolveDefaultLevel(options) !== 'err';
    return result;
}

export function appendError(result: IResult, err: string, options?: CheckOptions): IResult {
    result = result || { valid: true };

    if (defined(options?.code)) {
        result.code = options.code;
    }

    if (!options) {
        result = appendValue(result, 'err', err);
        result.valid = false;
        return result;
    }

    let appended = false;

    if (options.hint) {
        result = appendValue(result, 'hint', options.hint);
        appended = true;
    }
    if (options.warn) {
        result = appendValue(result, 'warn', options.warn);
        appended = true;
    }
    if (options.err) {
        result = appendValue(result, 'err', options.err);
        result.valid = false;
        appended = true;
    }

    if (appended) {
        setBaseText(result, {
            hint: result.hint,
            warn: result.warn,
            err: result.err,
        });
        if (!options.err) {
            result.valid = result.valid ?? true;
        }
        return result;
    }

    const coded = resolveCodeResult(err, options);
    if (coded) {
        if (coded.hint) result = appendValue(result, 'hint', coded.hint);
        if (coded.warn) result = appendValue(result, 'warn', coded.warn);
        if (coded.err) result = appendValue(result, 'err', coded.err);
        setBaseText(result, getBaseText(coded));
        result.valid = coded.valid;
        return result;
    }

    const level = resolveDefaultLevel(options);
    result = appendValue(result, level, err);
    setBaseText(result, {
        hint: result.hint,
        warn: result.warn,
        err: result.err,
    });
    result.valid = level !== 'err';
    return result;
}

function materializeResult(result: IResult, options?: ResultOptions): IResult {
    const next: IResult = { ...result };
    if (defined(result.code)) {
        const base = getBaseText(result);
        const translated = resolveCatalog(options).getResult(result.code, options?.language);
        if (translated) {
            delete next.hint;
            delete next.warn;
            delete next.err;

            if (defined(translated.hint) && translated.hint !== '') next.hint = translated.hint;
            else if (defined(base.hint)) next.hint = base.hint;

            if (defined(translated.warn) && translated.warn !== '') next.warn = translated.warn;
            else if (defined(base.warn)) next.warn = base.warn;

            if (defined(translated.err) && translated.err !== '') next.err = translated.err;
            else if (defined(base.err)) next.err = base.err;

            next.valid = translated.valid;
            next.code = translated.code;
            setBaseText(next, base);
        }
    } else {
        if (defined(result.hint)) next.hint = Array.isArray(result.hint) ? [...result.hint] : result.hint;
        if (defined(result.warn)) next.warn = Array.isArray(result.warn) ? [...result.warn] : result.warn;
        if (defined(result.err)) next.err = Array.isArray(result.err) ? [...result.err] : result.err;
    }

    if (Object.prototype.hasOwnProperty.call(result, 'results')) {
        const nested = result as ResultSet;
        const materialized = nested.results?.map(child => materializeResult(child, options)) ?? [];

        if (materialized.length > 0) {
            (next as ResultSet).results = materialized;
        } else {
            delete (next as ResultSet).results;
        }
    }

    return next;
}

function extractMessages(set: ResultSet): ResultSet {
    let hints: string[] = [];
    let warnings: string[] = [];
    let errors: string[] = [];

    if (set.hint) Array.isArray(set.hint) ? hints.push(...set.hint) : hints.push(set.hint);
    if (set.warn) Array.isArray(set.warn) ? warnings.push(...set.warn) : warnings.push(set.warn);
    if (set.err) Array.isArray(set.err) ? errors.push(...set.err) : errors.push(set.err);

    for (let child of set.results || []) {
        if (child.hint) Array.isArray(child.hint) ? hints.push(...child.hint) : hints.push(child.hint);
        if (child.warn) Array.isArray(child.warn) ? warnings.push(...child.warn) : warnings.push(child.warn);
        if (child.err) Array.isArray(child.err) ? errors.push(...child.err) : errors.push(child.err);

        if ((child as ResultSet).results?.length) {
            let childset = extractMessages(child as ResultSet);

            hints.push(...childset.hints || []);
            warnings.push(...childset.warnings || []);
            errors.push(...childset.errors || []);
        }
    }

    let result: ResultSet = { valid: errors.length === 0 };
    if (hints.length) result.hints = hints;
    if (warnings.length) result.warnings = warnings;
    if (errors.length) result.errors = errors;
    return result;
}

function getNestedSourceValue(source: any, field: string | number | undefined): any {
    if (!defined(field) || !defined(source)) {
        return undefined;
    }

    if (typeof source !== 'object') {
        return undefined;
    }

    return source[field as keyof typeof source];
}

function isTransparentUnnamedResult(result: IResult): result is ResultSet {
    if (defined(result.field) || defined(result.hint) || defined(result.warn) || defined(result.err) || defined(result.code)) {
        return false;
    }

    return Boolean((result as ResultSet).results?.length);
}

function mergeNestedFieldMap(
    fieldMap: { [key: string]: any },
    unnamedResults: IResult[],
    nested: any,
): void {
    for (const [key, value] of Object.entries(nested)) {
        if (key === '*') {
            unnamedResults.push(...value as IResult[]);
            continue;
        }

        fieldMap[key] = value;
    }
}

function collapseRedundantIndexedLayer(fieldKey: string, nested: any): any {
    if (!/^\d+$/.test(fieldKey) || !nested || typeof nested !== 'object' || Array.isArray(nested)) {
        return nested;
    }

    const keys = Object.keys(nested);
    if (keys.length !== 1 || keys[0] !== fieldKey) {
        return nested;
    }

    const duplicate = nested[fieldKey];
    if (!duplicate || typeof duplicate !== 'object' || Array.isArray(duplicate)) {
        return nested;
    }

    if (defined(duplicate.field) || defined(duplicate.value) || defined(duplicate.hint) || defined(duplicate.warn) || defined(duplicate.err) || defined(duplicate.code)) {
        return nested;
    }

    if (!duplicate.results || typeof duplicate.results !== 'object') {
        return nested;
    }

    return duplicate.results;
}

/**
 * Extract values and results per field into an object structure
 * where each field is a key, and its value is an object containing the combined results for that field.
 * This allows for easier access to results by field and aggregation of messages.
 * source is the original input data containing given values. Each field will have a value: field with the corresponding source value.
 * Nested results will be handled recursively.
 */
function nestFields(source: any, set: ResultSet): any {
    let fieldMap: { [key: string]: any } = {};
    let unnamedResults: IResult[] = [];

    const atRoot: any = {};
    if (set.hint) {
        atRoot.hint = set.hint;
    }
    if (set.warn) {
        atRoot.warn = set.warn;
    }
    if (set.err) {
        atRoot.valid = false;
        atRoot.err = set.err;
    }
    if (defined(set.code)) {
        atRoot.code = set.code;
    }
    if (Object.keys(atRoot).length) {
        unnamedResults.push(atRoot);
    }

    for (let child of set.results || []) {
        if (!defined(child.field)) {
            if (isTransparentUnnamedResult(child)) {
                mergeNestedFieldMap(fieldMap, unnamedResults, nestFields(source, child));
                continue;
            }

            unnamedResults.push({ ...child });
            continue;
        }

        const fieldKey = String(child.field);
        const childSource = getNestedSourceValue(source, child.field);
        const existing = fieldMap[fieldKey] || { value: childSource };

        existing.valid = existing.valid !== false ? child.valid : false;

        if (child.hint) {
            appendValue(existing, 'hint', child.hint);
        }

        if (child.warn) {
            appendValue(existing, 'warn', child.warn);
        }

        if (child.err) {
            appendValue(existing, 'err', child.err);
        }

        if (defined(child.code) && !defined(existing.code)) {
            existing.code = child.code;
        }

        const childResults = (child as ResultSet).results;
        // Nest child results recursively using the relevant portion of the source data
        // For nested fields, we can use the child.field to access the corresponding source value for that field
        if (childResults?.length) {
            existing.results = collapseRedundantIndexedLayer(fieldKey, nestFields(childSource, child as ResultSet));
        }

        fieldMap[fieldKey] = existing;
    }

    if (unnamedResults.length) {
        fieldMap['*'] = unnamedResults;
    }

    return fieldMap;
}

function validValues(input: any, set: IResult, mode: 'partial' | 'strict'): any {
    const cloned = cloneValue(input);
    const pruned = pruneInvalidValues(cloned, set, mode);

    return pruned.removed ? undefined : pruned.value;
}

function cloneValue(value: any): any {
    if (Array.isArray(value)) {
        return value.map(item => cloneValue(item));
    }

    if (value instanceof Date) {
        return new Date(value.getTime());
    }

    if (value && typeof value === 'object') {
        const cloned: Record<string, any> = {};
        for (const [key, child] of Object.entries(value)) {
            cloned[key] = cloneValue(child);
        }
        return cloned;
    }

    return value;
}

function pruneInvalidValues(value: any, result: IResult | undefined, mode: 'partial' | 'strict'): { removed: boolean, value?: any } {
    if (!defined(result)) {
        return { removed: false, value };
    }

    if (result.valid === false && !(result as ResultSet).results?.length) {
        return { removed: true };
    }

    const children = (result as ResultSet).results ?? [];
    if (children.length === 0) {
        return { removed: false, value };
    }

    if (Array.isArray(value)) {
        const next = [...value];
        const removals = new Set<number>();
        let foundInvalidDescendant = false;
        let foundMissingInvalidDescendant = false;

        for (const child of children) {
            if (!defined(child.field)) {
                if (child.valid === false) {
                    foundInvalidDescendant = true;
                }
                continue;
            }

            const index = typeof child.field === 'number' ? child.field : Number(child.field);
            if (!Number.isInteger(index) || index < 0 || index >= next.length) {
                if (child.valid === false) {
                    foundInvalidDescendant = true;
                    foundMissingInvalidDescendant = true;
                }
                continue;
            }

            const pruned = pruneInvalidValues(next[index], child, mode);
            if (pruned.removed) {
                removals.add(index);
                foundInvalidDescendant = true;
            } else {
                next[index] = pruned.value;
                if (child.valid === false) {
                    foundInvalidDescendant = true;
                }
            }
        }

        if (mode === 'strict' && (foundInvalidDescendant || result.valid === false)) {
            return { removed: true };
        }

        if (mode === 'partial' && result.valid === false && foundMissingInvalidDescendant) {
            return { removed: true };
        }

        if (removals.size > 0) {
            return {
                removed: false,
                value: next.filter((_, index) => !removals.has(index)),
            };
        }

        return { removed: false, value: next };
    }

    if (value && typeof value === 'object') {
        const next: Record<string, any> = { ...value };
        let foundInvalidDescendant = false;
        let foundMissingInvalidDescendant = false;

        for (const child of children) {
            if (!defined(child.field)) {
                if (child.valid === false) {
                    foundInvalidDescendant = true;
                }
                continue;
            }

            const key = String(child.field);
            if (!Object.prototype.hasOwnProperty.call(next, key)) {
                if (child.valid === false) {
                    foundInvalidDescendant = true;
                    foundMissingInvalidDescendant = true;
                }
                continue;
            }

            const pruned = pruneInvalidValues(next[key], child, mode);
            if (pruned.removed) {
                delete next[key];
                foundInvalidDescendant = true;
            } else {
                next[key] = pruned.value;
                if (child.valid === false) {
                    foundInvalidDescendant = true;
                }
            }
        }

        if (mode === 'strict' && (foundInvalidDescendant || result.valid === false)) {
            return { removed: true };
        }

        if (mode === 'partial' && result.valid === false && foundMissingInvalidDescendant) {
            return { removed: true };
        }

        return { removed: false, value: next };
    }

    return { removed: false, value };
}

/**
 * Find nested objects with the same value of 'field' and merge them,
 * merge hint, warn and err values into arrays if necessary, 
 * and ensure the 'valid' field is correctly set based on the presence of errors.
 */
function mergeFields(set: ResultSet): ResultSet {
    let fieldMap: { [key: string]: IResult } = {};
    let unnamedResults: IResult[] = [];

    for (let child of set.results || []) {
        if (!defined(child.field)) {
            // If no field, just keep as is (or handle differently if needed)
            unnamedResults.push({ ...child });
            continue;
        }

        const fieldKey = String(child.field);
        const existing = fieldMap[fieldKey];

        if (!existing) {
            fieldMap[fieldKey] = { ...child };
            continue;
        }

        let merged: IResult = existing;

        if (child.hint) {
            merged = appendValue(merged, 'hint', child.hint);
        }

        if (child.warn) {
            merged = appendValue(merged, 'warn', child.warn);
        }

        if (child.err) {
            merged = appendValue(merged, 'err', child.err);
        }

        if (defined(child.code) && !defined(merged.code)) {
            merged.code = child.code;
        }

        const childResults = (child as ResultSet).results;
        if (childResults?.length) {
            const mergedSet = merged as ResultSet;
            const mergedResults = mergedSet.results ? [...mergedSet.results] : [];

            mergedResults.push(...childResults);
            mergedSet.results = mergedResults;
        }

        fieldMap[fieldKey] = merged;
    }

    let mergedResults: ResultSet[] = Object.values(fieldMap);
    mergedResults.push(...unnamedResults);

    let result: ResultSet = { ...set, ...{ valid: set.valid } };
    if (mergedResults.length) {
        result.results = mergedResults;
    } else {
        delete result.results;
    }

    return result;
}

export function finalizeResult(out: IResult, options?: ResultOptions): IResult {
    return clearBaseText(materializeResult(out, options));
}

export function collectResults(input: any, out: ResultSet, options?: ResultOptions): ResultSet {
    const merged = finalizeResult(mergeFields(out), options) as ResultSet;
    const formatOnly = options?.raw || options?.nested || options?.validated || options?.flattened;
    const nested = options?.nested ? nestFields(input, merged) : undefined;

    let final: any = {};
    if (!options || Object.keys(options).length === 0 || !formatOnly) {
        final = { ...merged };
    } else {
        if (options.raw) final = { ...final, raw: merged };
        if (options.nested && defined(nested)) final = { ...final, input: nested };
        if (options.validated) final = { ...final, validated: validValues(input, merged, options.validated) };
        if (options.flattened) final = { ...final, ...extractMessages(merged) };
    }
    return final;
}