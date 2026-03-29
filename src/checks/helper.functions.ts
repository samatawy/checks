import type { CheckOptions, SingleResult, ResultSet, IResult } from './types';

export function defined<T>(value: T | null | undefined): value is NonNullable<T> {
    return value !== null && value !== undefined;
}

export function isPromise(value: any): value is Promise<any> {
    return value 
    && typeof value === 'object' 
    && typeof value.then === 'function' 
    && typeof value.catch === 'function';
}

export function buildErrorMessage(err: string, options?: CheckOptions): SingleResult {
    let result: SingleResult = { valid: false };

    if (!options) return { valid: false, err: err };

    if (err && (options.hint || options.warn)) {
        if (options.hint) appendString(result, 'hint', options.hint);
        if (options.warn) appendString(result, 'warn', options.warn);
        if (options.err) appendString(result, 'err', options.err);
        result.valid = !options.err;
        return result;
    }

    if (err) {
        result.err = options.err || err;
        result.valid = false;
    }
    return result;
}

export function appendError(result: IResult, err: string, options?: CheckOptions): IResult {
    result = result || { valid: true };

    if (!options) return { ...result, ...{ valid: false, err: err } };

    if (err && (options.hint || options.warn)) {
        if (options.hint) result = appendString(result, 'hint', options.hint);
        if (options.warn) result = appendString(result, 'warn', options.warn);
        if (options.err) result = appendString(result, 'err', options.err);
        result.valid = !options.err;
        return result;
    }

    if (err) {
        result = appendString(result, 'err', options?.err || err);
        result.valid = false;
    }
    return result;
}

function appendString(data: any, key: string, value: string | string[]): any {
    let found = data[key];
    if (!found) {
        data[key] = value;
        return data;
    }

    if (typeof found === 'string') {
        data[key] = [found, value ];
    } else if (Array.isArray(found)) {
        found.push(value);
    } else {
        console.debug('Noop for ', key, ' with value:', value, ' in data:', data);
    }
    return data;
}

    function extract(set: ResultSet): ResultSet {
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

            if (Object.prototype.hasOwnProperty.call(child, 'results')) {
                let childset = extract(child as ResultSet);

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
        if (Object.keys(atRoot).length) {
            unnamedResults.push(atRoot);
        }

        for (let child of set.results || []) {
            if (!defined(child.field)) {
                // If no field, just keep as is (or handle differently if needed)
                unnamedResults.push({ ...child });
                continue;
            }

            const fieldKey = String(child.field);
            const existing = fieldMap[fieldKey] || { value: source[child.field] };

            existing.valid = existing.valid !== false ? child.valid : false;

            if (child.hint) {
                existing.hint = existing.hint ? (Array.isArray(existing.hint) ? [...existing.hint, child.hint] : [existing.hint, child.hint]) : child.hint;
            }

            if (child.warn) {
                existing.warn = existing.warn ? (Array.isArray(existing.warn) ? [...existing.warn, child.warn] : [existing.warn, child.warn]) : child.warn;
            }

            if (child.err) {
                existing.err = existing.err ? (Array.isArray(existing.err) ? [...existing.err, child.err] : [existing.err, child.err]) : child.err;
            }

            const childResults = (child as ResultSet).results;
            // Nest child results recursively using the relevant portion of the source data
            // For nested fields, we can use the child.field to access the corresponding source value for that field
            if (childResults) {
                existing.results = nestFields(source[child.field], child as ResultSet);
                // console.debug('Nested results for field', child.field, ':', child);
            }
            // console.debug('Mapping field', fieldKey, 'with result', existing);

            fieldMap[fieldKey] = existing;
        }

        if (unnamedResults.length) {
            fieldMap['*'] = unnamedResults;
        }

        return fieldMap;
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
                merged = appendString(merged, 'hint', child.hint);
            }

            if (child.warn) {
                merged = appendString(merged, 'warn', child.warn);
            }

            if (child.err) {
                merged = appendString(merged, 'err', child.err);
            }

            const childResults = (child as ResultSet).results;
            if (childResults) {
                const mergedSet = merged as ResultSet;
                const mergedResults = mergedSet.results ?? [];

                mergedResults.push(...childResults);
                mergedSet.results = mergedResults;
            }

            fieldMap[fieldKey] = merged;
        }

        let mergedResults: ResultSet[] = Object.values(fieldMap);
        mergedResults.push(...unnamedResults);

        let result: ResultSet = { ...set, ...{ valid: set.valid, results: mergedResults } };
        // if (set.hint) result.hints = set.hints;
        // if (set.warn) result.warnings = set.warnings;
        // if (set.err) result.errors = set.errors;
        return result;
    }

    export function collectResults(input: any, out: ResultSet): ResultSet {
        const merged = mergeFields(out);
        // const merged = out;
        return {input: nestFields(input, merged), ...extract(merged), ...merged};
    }

    export function collectResultsFlat(out: ResultSet): ResultSet {
        const merged = mergeFields(out);
        // const merged = out;
        return extract(merged);
    }

    export function collectResultsNested(input: any, out: ResultSet): ResultSet {
        const merged = mergeFields(out);
        // const merged = out;
        return nestFields(input, merged);
    }

