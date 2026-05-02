import type { ArrayContainsOptions, Check, CheckOptions, IResult, ResultSet, ResultOptions } from '../types';
import type { ClassValidationOptions } from '../decorators/decorator.factory';
import { ArrayItemCheck } from './array.item.check';
import { deepEqual, defined, buildErrorMessage, appendError, isPromise } from './helper.functions';
import { collectResults } from './helper.functions';


export class ArrayCheck implements Check {

    protected key: string | number | null | undefined;

    protected data: any;

    protected oldData: any;

    protected has_value: boolean;

    protected is_array: boolean;

    protected out: ResultSet;

    static for(data: unknown): ArrayCheck {
        return new ArrayCheck(null, data);
    }

    constructor(key: string | number | null | undefined, data: any) {

        this.key = key;
        if (defined(key) && defined(data)) {
            this.data = data[key];
        } else if (defined(data)) {
            this.data = data;
        } else {
            this.data = null;
        }
        this.out = defined(this.key) ? { field: this.key, valid: true } : { valid: true };
        this.oldData = undefined;

        this.has_value = this.data !== null && this.data !== undefined;
        this.is_array = Array.isArray(this.data);
        if (this.has_value) {
            this.array();
        }
    }

    public updating(oldData: any): this {
        if (defined(this.key) && defined(oldData)) {
            this.oldData = oldData[this.key];
        } else if (defined(oldData)) {
            this.oldData = oldData;
        } else {
            this.oldData = undefined;
        }
        return this;
    }

    public notEmpty(options?: CheckOptions): this {
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (this.data === null || this.data === undefined) {
            this.errorMessage(prefix + ' is required', options);
            return this;
        }
        if (this.data.length === 0) {
            this.errorMessage(prefix + ' must not be empty', options);
        }
        return this;
    }

    public array(options?: CheckOptions): this {
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (!Array.isArray(this.data)) {
            this.errorMessage(prefix + ' must be an array.', options);
        }
        return this;
    }

    public minLength(length: number, options?: CheckOptions): this {
        if (!this.is_array) return this;

        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (this.data.length < length) {
            this.errorMessage(prefix + ` must have at least ${length} items.`, options);
        }
        return this;
    }

    public maxLength(length: number, options?: CheckOptions): this {
        if (!this.is_array) return this;
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (this.data.length > length) {
            this.errorMessage(prefix + ` must have at most ${length} items.`, options);
        }
        return this;
    }

    public noDuplicates(key?: string, options?: CheckOptions): this {
        if (!this.is_array) return this;
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        const seen = new Set();
        for (const item of this.data) {
            const value = key ? item[key] : item;
            if (seen.has(value)) {
                this.errorMessage(prefix + ' must not contain duplicate items.', options);
                break;
            }
            seen.add(value);
        }
        return this;
    }

    protected async rules(field_checks: (Check | Promise<Check>)[]): Promise<this> {
        for (const field_check of field_checks) {
            const check = isPromise(field_check) ? await field_check : field_check;
            const found = check.result();

            if (check === this) {
                continue;
            }

            if (found.hint || found.warn || found.err || (found as ResultSet).results?.length) {
                this.out.results = this.out.results || [];
                this.out.results.push(found);
            }
            if (found.err) {
                this.out.valid = false;
            }
        }
        return this;
    }

    /**
     * Runs a group of array-level checks and merges their results.
     *
     * Return an array of checks from the callback. Each check can be synchronous
     * or a promise.
     *
     * @example
     * ```ts
     * const checker = await ObjectCheck.for({ tags: ['Ada'] }).check(root => [
     *   root.required('tags').array().check(tags => [
     *     tags.minLength(1),
     *     tags.maxLength(5)
     *   ])
     * ]);
     * ```
     */
    public async check(func: (checker: ArrayCheck) => (Check | Promise<Check>)[]): Promise<this> {
        const field_checks = func(this);
        await this.rules(field_checks);
        return this;
    }

    /**
     * Alias for {@link check} using JSON Schema-style naming.
     *
     * All returned checks must pass for the composed result to stay valid.
     */
    public async allOf(func: (checker: ArrayCheck) => (Check | Promise<Check>)[]): Promise<this> {
        return this.check(func);
    }

    /**
     * Evaluates alternative array branches and succeeds when at least one branch is valid.
     *
     * Each branch function is evaluated in isolation using cloned array state.
     * Valid branches are then replayed on the current checker so mutations behave
     * the same way as normal non-branch checks.
     *
     * @example
     * ```ts
     * const checker = await ObjectCheck.for({ tags: ['  Ada  '] }).check(root => [
     *   root.required('tags').array().anyOf([
     *     tags => [tags.checkEach(item => [item.string().trim().minLength(2)])],
     *     tags => [tags.maxLength(1)]
     *   ])
     * ]);
     * ```
     */
    public async anyOf(branches: Array<(checker: ArrayCheck) => (Check | Promise<Check>)[]>): Promise<this> {
        return this.composeAlternatives('anyOf', branches);
    }

    /**
     * Evaluates alternative array branches and succeeds only when exactly one branch is valid.
     *
     * Each branch function is evaluated in isolation using cloned array state.
     * The single winning branch is then replayed on the current checker so
     * mutations behave the same way as normal non-branch checks.
     */
    public async oneOf(branches: Array<(checker: ArrayCheck) => (Check | Promise<Check>)[]>): Promise<this> {
        return this.composeAlternatives('oneOf', branches);
    }

    /**
     * Inverts a composed array branch and fails when that branch is valid.
     *
     * The negated branch is evaluated in isolation and is never replayed onto
     * the current checker, so mutations inside the branch do not affect the
     * original input.
     */
    public async not(
        func: (checker: ArrayCheck) => (Check | Promise<Check>)[],
        options?: CheckOptions,
    ): Promise<this> {
        const checker = this.createAlternativeChecker();
        await checker.rules(func(checker));

        if (checker.result().valid) {
            this.errorMessage('Negated branch must not be valid.', options);
        }

        return this;
    }

    protected async rulesEach(i: number, field_checks: (Check | Promise<Check>)[]): Promise<this> {
        const per_item: IResult[] = [];

        for (const field_check of field_checks) {
            const check = isPromise(field_check) ? await field_check : field_check;
            const found = check.result();

            if (found.hint || found.warn || found.err || (found as ResultSet).results?.length) {
                per_item.push(found);
            }
            if (found.err || (found as ResultSet).results?.some(r => !r.valid)) {
                this.out.valid = false;
            }
        }
        if (per_item.length) {
            const prefix = i;   // defined(this.key) ? `Field ${this.key}[${i}]` : `Item ${i}`;
            this.out.results = this.out.results || [];
            this.out.results.push({
                field: prefix,
                valid: per_item.every(r => r.valid),
                results: per_item
            });
        }
        return this;
    }

    public async checkEach(func: (checker: ArrayItemCheck) => (Check | Promise<Check>)[]): Promise<this> {
        if (this.is_array) {
            for (let i = 0; i < this.data.length; i++) {
                const item_check = new ArrayItemCheck(i, this.data).updating(this.oldData);
                const field_checks = func(item_check);
                await this.rulesEach(i, field_checks);
            }
        }
        return this;
    }

    /**
     * Validates each array item against a decorated class definition.
     *
     * This is shorthand for `checkEach(item => [item.matchesType(...)])`.
     */
    public async matchesType<T>(
        type: abstract new (...args: any[]) => T,
        options?: ClassValidationOptions,
    ): Promise<this> {
        await this.checkEach(item => [item.matchesType(type, options)]);
        return this;
    }

    /**
     * Succeeds when a bounded number of array items satisfy the provided item-level checks.
     *
     * Matching items are evaluated in isolation first. When the overall contains
     * condition is valid, the matching item checks are replayed on the real array
     * so mutations such as `trim()` or tolerant parsing still affect the input.
     * Non-matching item errors are not merged into the final result.
     */
    public async contains(
        func: (checker: ArrayItemCheck) => (Check | Promise<Check>)[],
        options?: ArrayContainsOptions,
    ): Promise<this> {
        if (!this.is_array) return this;

        const minimumMatches = options?.minCount ?? 1;
        const maximumMatches = options?.maxCount;

        this.assertContainsBounds(minimumMatches, maximumMatches);

        const matchingIndexes: number[] = [];

        for (let index = 0; index < this.data.length; index++) {
            if (await this.matchesContainsBranch(index, func)) {
                matchingIndexes.push(index);
            }
        }

        if (matchingIndexes.length < minimumMatches) {
            this.errorMessage(
                this.buildContainsMessage(minimumMatches),
                this.toContainsCheckOptions(options, options?.minErr ?? options?.err),
            );
            return this;
        }

        if (defined(maximumMatches) && matchingIndexes.length > maximumMatches) {
            this.errorMessage(
                this.buildMaxContainsMessage(maximumMatches),
                this.toContainsCheckOptions(options, options?.maxErr ?? options?.err),
            );
            return this;
        }

        for (const index of matchingIndexes) {
            const itemCheck = new ArrayItemCheck(index, this.data).updating(this.oldData);
            await this.rulesEach(index, func(itemCheck));
        }

        return this;
    }

    public async isTrue(func: (data: any) => boolean | Promise<boolean>, options?: CheckOptions): Promise<this> {
        if (!this.has_value) return this;

        const result = func(this.data);
        const valid = isPromise(result) ? await result : result;
        if (!valid) {
            this.errorMessage('Custom check failed', options);
        }
        return this;
    }

    public async canUpdate(
        func: (oldValue: unknown, newValue: unknown) => boolean | Promise<boolean>,
        options?: CheckOptions,
    ): Promise<this> {
        if (!this.has_value) return this;

        const result = func(this.oldData, this.data);
        const valid = isPromise(result) ? await result : result;

        if (!valid) {
            const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';
            this.errorMessage(`${prefix} cannot be updated from ${JSON.stringify(this.oldData)} to ${JSON.stringify(this.data)}`, options);
        }

        return this;
    }

    public async canAdd(
        func: (array: unknown[], item: unknown) => boolean | Promise<boolean>,
        options?: CheckOptions,
    ): Promise<this> {
        if (!this.has_value || !this.is_array) return this;

        const currentArray = this.data as unknown[];
        const previousArray = Array.isArray(this.oldData) ? this.oldData as unknown[] : [];
        const addedItems = this.diffArrayItems(currentArray, previousArray);

        for (const item of addedItems) {
            const result = func(currentArray, item);
            const valid = isPromise(result) ? await result : result;

            if (!valid) {
                const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';
                this.errorMessage(`${prefix} cannot add item ${JSON.stringify(item)}`, options);
            }
        }

        return this;
    }

    public async canDelete(
        func: (array: unknown[], item: unknown) => boolean | Promise<boolean>,
        options?: CheckOptions,
    ): Promise<this> {
        if (!this.has_value || !this.is_array) return this;

        const currentArray = this.data as unknown[];
        const previousArray = Array.isArray(this.oldData) ? this.oldData as unknown[] : [];
        const deletedItems = this.diffArrayItems(previousArray, currentArray);

        for (const item of deletedItems) {
            const result = func(previousArray, item);
            const valid = isPromise(result) ? await result : result;

            if (!valid) {
                const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';
                this.errorMessage(`${prefix} cannot delete item ${JSON.stringify(item)}`, options);
            }
        }

        return this;
    }

    public immutable(options?: CheckOptions): this {
        if (!this.has_value) return this;

        if (defined(this.oldData) && !deepEqual(this.oldData, this.data)) {
            const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';
            this.errorMessage(
                `${prefix} is immutable and cannot be updated from ${JSON.stringify(this.oldData)} to ${JSON.stringify(this.data)}`,
                options,
            );
        }

        return this;
    }

    public async isTrueEach(func: (data: any) => boolean | Promise<boolean>, options?: CheckOptions): Promise<this> {
        if (!this.is_array) return this;

        for (let i = 0; i < this.data.length; i++) {
            const result = func(this.data[i]);
            const valid = isPromise(result) ? await result : result;
            if (!valid) {
                const prefix = defined(this.key) ? `Field ${this.key}[${i}]` : `Item ${i}`;
                const err = options?.err || 'Custom check failed';
                this.out.results = this.out.results || [];
                this.out.results.push(buildErrorMessage(prefix + ': ' + err, options));
                this.out.valid = false;
            }
        }
        return this;
    }

    protected errorMessage(err: string, options?: CheckOptions): void {
        this.out = appendError(this.out, err, options);
    }

    private async matchesContainsBranch(
        index: number,
        func: (checker: ArrayItemCheck) => (Check | Promise<Check>)[],
    ): Promise<boolean> {
        const itemCheck = new ArrayItemCheck(index, this.cloneAlternativeValue(this.data))
            .updating(this.cloneAlternativeValue(this.oldData));

        for (const fieldCheck of func(itemCheck)) {
            const check = isPromise(fieldCheck) ? await fieldCheck : fieldCheck;

            if (!check.result().valid) {
                return false;
            }
        }

        return true;
    }

    private assertContainsBounds(minimumMatches: number, maximumMatches?: number): void {
        if (!Number.isInteger(minimumMatches)) {
            throw new Error('Array contains minimum match count must be an integer.');
        }

        if (defined(maximumMatches) && !Number.isInteger(maximumMatches)) {
            throw new Error('Array contains maximum match count must be an integer.');
        }

        if (minimumMatches < 0) {
            throw new Error('Array contains minimum match count must be at least 0.');
        }

        if (defined(maximumMatches) && maximumMatches < 0) {
            throw new Error('Array contains maximum match count must be at least 0.');
        }

        if (defined(maximumMatches) && minimumMatches > maximumMatches) {
            throw new Error('Array contains minimum match count must not exceed the maximum match count.');
        }
    }

    private buildContainsMessage(minimumMatches: number): string {
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        return minimumMatches === 1
            ? `${prefix} must contain at least one item matching the required checks.`
            : `${prefix} must contain at least ${minimumMatches} items matching the required checks.`;
    }

    private buildMaxContainsMessage(maximumMatches: number): string {
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        return maximumMatches === 1
            ? `${prefix} must contain at most one item matching the required checks.`
            : `${prefix} must contain at most ${maximumMatches} items matching the required checks.`;
    }

    private toContainsCheckOptions(options?: ArrayContainsOptions, err?: string | string[]): CheckOptions | undefined {
        if (!options && !defined(err)) {
            return undefined;
        }

        return {
            hint: options?.hint,
            warn: options?.warn,
            err,
            code: options?.code,
            catalog: options?.catalog,
        };
    }

    private async composeAlternatives(
        mode: 'anyOf' | 'oneOf',
        branches: Array<(checker: ArrayCheck) => (Check | Promise<Check>)[]>,
    ): Promise<this> {
        if (branches.length === 0) {
            return this;
        }

        const evaluated: Array<{
            branch: (checker: ArrayCheck) => (Check | Promise<Check>)[],
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

    private createAlternativeChecker(): ArrayCheck {
        const checker = new ArrayCheck(null, this.cloneAlternativeValue(this.data));
        checker.key = this.key;
        checker.out = defined(this.key) ? { field: this.key, valid: true } : { valid: true };
        checker.updating(this.cloneAlternativeValue(this.oldData));
        return checker;
    }

    private cloneAlternativeValue<T>(value: T): T {
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

    private mergeBranchResult(result: IResult): void {
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
            this.out.results = [...(this.out.results ?? []), ...((result as ResultSet).results ?? [])];
        }
        if (!result.valid && !(result as ResultSet).results?.length && (defined(result.hint) || defined(result.warn) || defined(result.err))) {
            this.out.results = [...(this.out.results ?? []), result];
        }
        if (!result.valid) {
            this.out.valid = false;
        }
    }

    private mergeMessageValue(
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

    private toArray(value?: string | string[]): string[] {
        if (!defined(value)) {
            return [];
        }

        return Array.isArray(value) ? [...value] : [value];
    }

    private diffArrayItems(source: unknown[], baseline: unknown[]): unknown[] {
        const remaining = [...baseline];
        const diff: unknown[] = [];

        for (const item of source) {
            const matchIndex = remaining.findIndex(candidate => deepEqual(candidate, item));

            if (matchIndex === -1) {
                diff.push(item);
                continue;
            }

            remaining.splice(matchIndex, 1);
        }

        return diff;
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

    public result(options?: ResultOptions): IResult {
        // ensure overall validity is false if any part is invalid
        for (const part of this.out.results || []) {
            if (!part.valid) {
                this.out.valid = false;
                break;
            }
        }

        if (!options || Object.keys(options).length === 0) {
            return this.out;
        }

        // format output based on options
        return collectResults(this.data, this.out, options);
    }

}