import { buildErrorMessage, appendError, defined, isPromise } from './helper.functions';
import type { Check, CheckOptions, IResult } from './types';

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

    public async is_true(func: (data: any) => boolean | Promise<boolean>, options?: CheckOptions): Promise<this> {
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

    public result(): IResult {
        if (Object.keys(this.out).length === 0) {
            return { valid: true };
        }
        return this.out;
    }
}