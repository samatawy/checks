import { ArrayItemCheck } from './array.item.check';
import { defined, buildErrorMessage, appendError, isPromise } from './helper.functions';
import { collectResults, collectResultsFlat, collectResultsNested } from './helper.functions';
import type { Check, CheckOptions, IResult, ResultSet } from './types';

export class ArrayCheck implements Check {

    protected key: string | number | null | undefined;

    protected data: any;

    protected has_value: boolean;

    protected is_array: boolean;

    protected out: ResultSet;

    static for(data: unknown): ArrayCheck {
        return new ArrayCheck(null, data);
    }

    constructor(key: string | number | null | undefined, data: any) {

        this.key = key;
        if (key && data) {
            this.data = data[key];
        } else if (data) {
            this.data = data;
        } else {
            this.data = null;
        }
        this.out = defined(this.key) ? { field: this.key, valid: true } : { valid: true };

        this.has_value = this.data !== null && this.data !== undefined;
        this.is_array = Array.isArray(this.data);
        if (this.has_value) {
            this.array();
        }
    }

    public notEmpty(): this {
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (this.data === null && this.data === undefined) {
            this.errorMessage(prefix + ' is required');
        }
        if (this.data.length === 0) {
            this.errorMessage(prefix + ' must not be empty');
        }
        return this;
    }

    public array(): this {
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (!Array.isArray(this.data)) {
            this.errorMessage(prefix + ' must be an array.');
        }
        return this;
    }

    public minLength(length: number): this {
        if (!this.is_array) return this;

        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (this.data.length < length) {
            this.errorMessage(prefix + ` must have at least ${length} items.`);
        }
        return this;
    }

    public maxLength(length: number): this {
        if (!this.is_array) return this;
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (this.data.length > length) {
            this.errorMessage(prefix + ` must have at most ${length} items.`);
        }
        return this;
    }

    protected async rules_each(i: number, field_checks: (Check | Promise<Check>)[]): Promise<this> {
        const per_item: IResult[] = [];

        for (const field_check of field_checks) {
            const check = isPromise(field_check) ? await field_check : field_check;
            const found = check.result();

            if (found.hint || found.warn || found.err) {
                // this.out.results = this.out.results || [];
                // this.out.results.push(found);
                per_item.push(found);
            }
            if (found.err) {
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

    public async check_each(func: (checker: ArrayItemCheck) => (Check | Promise<Check>)[]): Promise<this> {
        if (this.is_array) {
            for (let i = 0; i < this.data.length; i++) {
                const item_check = new ArrayItemCheck(i, this.data);
                const field_checks = func(item_check);
                await this.rules_each(i, field_checks);
            }
        }
        return this;
    }

    public async is_true(func: (data: any) => boolean | Promise<boolean>, options?: CheckOptions): Promise<this> {
        if (!this.has_value) return this;

        const result = func(this.data);
        const valid = isPromise(result) ? await result : result;
        if (!valid) {
            this.errorMessage('Custom check failed', options);
        }
        return this;
    }

    public async is_true_each(func: (data: any) => boolean | Promise<boolean>, options?: CheckOptions): Promise<this> {
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

    public inherit(priors: IResult): this {
        if (!priors.valid) {
            this.out = {
                ...this.out,
                ...priors
            };
        }
        return this;
    }

    public result(): IResult {
        for (const part of this.out.results || []) {
            if (!part.valid) {
                this.out.valid = false;
                break;
            }
        }
        return this.out;
    }

    public collect(): ResultSet {
        return collectResults(this.data, this.out);
    }

    public collectFlat(): ResultSet {
        return collectResultsFlat(this.out);
    }

    public collectNested(): ResultSet {
        return collectResultsNested(this.data, this.out);
    }
}