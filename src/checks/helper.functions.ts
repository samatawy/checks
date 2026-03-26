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

            merged.valid = merged.valid && child.valid;
            fieldMap[fieldKey] = merged;
        }

        let mergedResults: ResultSet[] = Object.values(fieldMap);
        mergedResults.push(...unnamedResults);

        let result: ResultSet = { valid: set.valid, results: mergedResults };
        return result;
    }

    export function collectResults(out: ResultSet): ResultSet {
        const merged = mergeFields(out);
        // const merged = out;
        return {...merged, ...extract(merged)};
    }


