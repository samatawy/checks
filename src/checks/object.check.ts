import { ArrayCheck } from './array.check';
import { FieldCheck } from './field.check';
import { defined, buildErrorMessage, appendError, collectResults, isPromise } from './helper.functions';
import type { Check, CheckOptions, IResult, ResultSet } from './types';

export class ObjectCheck implements Check {

    protected key: string | number | null | undefined;

    protected data: any;

    protected has_value: boolean;

    protected is_object: boolean;

    protected out: ResultSet;

    static for(data: any): ObjectCheck {
        return new ObjectCheck(null, data);
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

        this.has_value = this.data !== null && this.data !== undefined;
        this.is_object = typeof this.data === 'object' && !Array.isArray(this.data);
        if (this.has_value) {
            this.object();
        }
    }

    public notEmpty(): this {
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (this.data === null && this.data === undefined) {
            this.errorMessage(prefix + ' is required');
        }
        if (Object.keys(this.data).length === 0) {
            this.errorMessage(prefix + ' must not be empty');
        }
        return this;
    }

    public object(): this {
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (Array.isArray(this.data)) {
            this.errorMessage(prefix + ' must not be an array.');
            return this;
        }
        if (typeof this.data !== 'object') {
            this.errorMessage(prefix + ' must be an object.');
            return this;
        }
        return this;
    }

    public required(name: string): FieldCheck {
        return new FieldCheck(name, this.data).required();
    }

    public optional(name: string): FieldCheck {
        return new FieldCheck(name, this.data);
    }

    protected async rules(field_checks: (Check | Promise<Check>)[]): Promise<this> {
        for (const field_check of field_checks) {
            const check = isPromise(field_check) ? await field_check : field_check;

            const found = check.result();

            if (check === this) {
                console.debug('Circular result', found);
                break;
            }

            if (found.hint || found.warn || found.err) {
                this.out.results = this.out.results || [];
                this.out.results.push(found);
            }
            if ((found as ResultSet).results?.length) {
                this.out.results = this.out.results || [];
                this.out.results.push(found);
            }
            if (found.err) {
                this.out.valid = false;
            }
        }
        return this;
    }

    public async check(func: (checker: ObjectCheck) => (Check | Promise<Check>)[]): Promise<this> {
        const field_checks = func(this);
        await this.rules(field_checks);
        return this;
    }

    public async is_true(func: (data: any) => boolean | Promise<boolean>, options?: CheckOptions): Promise<ObjectCheck> {
        if (!this.has_value) return this;

        const result = func(this.data);
        const valid = isPromise(result) ? await result : result;

        if (!valid) {
            const custom = new ObjectCheck(this.key, this.data);
            custom.errorMessage('Custom check failed', options);
            return custom;
        }
        return this;
    }

    protected errorMessage(err: string, options?: CheckOptions): void {
        this.out = appendError(this.out, err, options);
    }

    public inherit(priors: IResult): this {
        if (!priors.valid) {
            this.out = { ...this.out, ...priors };
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
        return collectResults(this.out);
    }
}