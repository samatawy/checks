import { appendError, defined, finalizeResult, isPromise } from './helper.functions';
import type { Check, CheckOptions, EqualityCheckOptions, IResult, ResultOptions, ResultSet } from '../types';

export abstract class ValueCheck implements Check {

    protected key: string | number;

    protected data: any;

    protected has_value: boolean;

    protected out: IResult;

    constructor(key: string | number, data: any) {
        this.key = key;
        this.data = data;
        if (this.data) {
            this.has_value = this.data[this.key] !== null && this.data[this.key] !== undefined;
        } else {
            this.has_value = false;
        }
        this.out = { field: `${this.key}`, valid: true };
    }

    public inherit(priors: IResult): this {
        if (!priors.valid) {
            this.out = {
                ...this.out,
                ...priors
            };
        }
        return this;
    }

    // public required(options?: CheckOptions): this {
    //     if (this.data === null || this.data === undefined ||
    //         this.key === null || this.key === undefined ||
    //         this.data[this.key] === null || this.data[this.key] === undefined) {
    //         // this.out = { ...this.out, ...{ valid: false, err: `Field ${this.key} is required` } };
    //         this.out = appendError(this.out, `Field ${this.key} is required`, options);
    //     }
    //     return this;
    // }
    //
    // public requires(field: string, condition: (data: any) => boolean, options?: CheckOptions): this {
    //     if (condition(this.data)) {
    //         console.debug('Condition met for requires check on field', field);
    //         if (!defined(this.data[field])) {
    //             this.out = appendError(this.out, `Field ${this.key} requires a value for ${field}`, options);
    //         }
    //     }
    //     return this;
    // }

    public async isTrue(func: (data: any) => boolean | Promise<boolean>, options?: CheckOptions): Promise<this> {
        if (!this.has_value) return this;

        const result = func(this.data);
        const valid = isPromise(result) ? await result : result;
        if (!valid) {
            this.errorMessage('Custom check failed', options);
        }
        return this;
    }

    protected errorMessage(err: string, options?: CheckOptions) {
        this.out = appendError(this.out, err, options);
    }

    protected normalizeEqualityValues(
        actual: unknown,
        expected: unknown,
        options?: EqualityCheckOptions,
    ): { actual: unknown, expected: unknown } {
        if (options?.case !== 'insensitive') {
            return { actual, expected };
        }

        if (typeof actual === 'string' || typeof expected === 'string') {
            return {
                actual: String(actual).toLowerCase(),
                expected: String(expected).toLowerCase(),
            };
        }

        return { actual, expected };
    }

    protected equalityMatches(actual: unknown, expected: unknown, options?: EqualityCheckOptions): boolean {
        const normalized = this.normalizeEqualityValues(actual, expected, options);

        return options?.tolerant
            ? normalized.actual == normalized.expected
            : normalized.actual === normalized.expected;
    }
    
    protected async rules(field_checks: (Check | Promise<Check>)[]): Promise<this> {
        for (const field_check of field_checks) {
            const check = isPromise(field_check) ? await field_check : field_check;
            const found = check.result();

            if (check === this) {
                continue;
            }

            if (found.hint || found.warn || found.err || (found as ResultSet).results?.length) {
                (this.out as ResultSet).results = (this.out as ResultSet).results || [];
                (this.out as ResultSet).results!.push(found);
            }
            if (!found.valid) {
                this.out.valid = false;
            }
        }
        return this;
    }

    protected async composeAlternatives(
        mode: 'anyOf' | 'oneOf',
        branches: Array<(checker: this) => (Check | Promise<Check>)[]>,
    ): Promise<this> {
        if (branches.length === 0) {
            return this;
        }

        const evaluated: Array<{
            branch: (typeof branches)[number],
            result: IResult,
        }> = [];

        for (const branch of branches) {
            const checker = this.createAlternativeChecker();
            await checker.rules(branch(checker));
            evaluated.push({ branch, result: checker.result() });
        }

        const validBranches = evaluated.filter(entry => entry.result.valid);

        if (mode === 'anyOf') {
            if (validBranches.length === 0) {
                this.errorMessage('At least one anyOf branch must be valid.');
                for (const branch of evaluated) {
                    this.mergeBranchResult(branch.result);
                }
                return this;
            }

            for (const branch of validBranches) {
                await this.rules(branch.branch(this));
            }
            return this;
        }

        if (validBranches.length !== 1) {
            this.errorMessage('Exactly one oneOf branch must be valid.');

            if (validBranches.length === 0) {
                for (const branch of evaluated) {
                    this.mergeBranchResult(branch.result);
                }
            }

            return this;
        }

        await this.rules(validBranches[0]!.branch(this));
        return this;
    }

    public async not(
        func: (checker: this) => (Check | Promise<Check>)[],
        options?: CheckOptions,
    ): Promise<this> {
        const checker = this.createAlternativeChecker();
        await checker.rules(func(checker));

        if (checker.result().valid) {
            this.errorMessage('Negated branch must not be valid.', options);
        }

        return this;
    }

    protected createAlternativeChecker(): this {
        const ValueCheckClass = this.constructor as new (key: string | number, data: any) => this;
        return new ValueCheckClass(this.key, this.cloneAlternativeValue(this.data));
    }

    protected cloneAlternativeValue<T>(value: T): T {
        if (Array.isArray(value)) {
            return value.map(item => this.cloneAlternativeValue(item)) as T;
        }

        if (value instanceof Date) {
            return new Date(value.getTime()) as T;
        }

        if (defined(value) && typeof value === 'object') {
            const cloned: Record<string, unknown> = {};
            for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
                cloned[key] = this.cloneAlternativeValue(child);
            }
            return cloned as T;
        }

        return value;
    }

    protected mergeBranchResult(result: IResult): void {
        if (defined(result.hint)) {
            this.out.hint = this.mergeMessageValue(this.out.hint, result.hint);
        }
        if (defined(result.warn)) {
            this.out.warn = this.mergeMessageValue(this.out.warn, result.warn);
        }
        if (defined(result.err)) {
            this.out.err = this.mergeMessageValue(this.out.err, result.err);
            this.out.valid = false;
        }
        if (defined(result.code) && !defined(this.out.code)) {
            this.out.code = result.code;
        }
        if ((result as ResultSet).results?.length) {
            (this.out as ResultSet).results = [
                ...(((this.out as ResultSet).results) ?? []),
                ...((result as ResultSet).results ?? []),
            ];
        }
        if (!result.valid && !(result as ResultSet).results?.length && (defined(result.hint) || defined(result.warn) || defined(result.err))) {
            (this.out as ResultSet).results = [...(((this.out as ResultSet).results) ?? []), result];
        }
        if (!result.valid) {
            this.out.valid = false;
        }
    }

    protected mergeMessageValue(
        current?: string | string[],
        incoming?: string | string[],
    ): string | string[] | undefined {
        const values = this.toArray(current);
        values.push(...this.toArray(incoming));

        if (values.length === 0) {
            return undefined;
        }

        return values.length === 1 ? values[0] : values;
    }

    protected toArray(value?: string | string[]): string[] {
        if (!defined(value)) {
            return [];
        }

        return Array.isArray(value) ? [...value] : [value];
    }

    public result(options?: ResultOptions): IResult {
        if (Object.keys(this.out).length === 0) {
            return { valid: true };
        }
        if (!options || Object.keys(options).length === 0) {
            return this.out;
        }
        return finalizeResult(this.out, options);
    }
}