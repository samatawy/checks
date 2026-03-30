import type { Check, CheckOptions, IResult, ResultSet, ResultOptions } from './types';
import { ArrayCheck } from './array.check';
import { FieldCheck } from './field.check';
import { defined, buildErrorMessage, appendError, isPromise } from './helper.functions';
import { collectResults } from './helper.functions';

export class ObjectCheck implements Check {

    protected key: string | number | null | undefined;

    protected data: any;

    protected has_value: boolean;

    protected is_object: boolean;

    protected check_extra_fields: boolean;

    protected known_keys: Set<string>;

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
        this.known_keys = new Set<string>();
        this.check_extra_fields = false;

        if (this.has_value) {
            this.object();
        }
    }

    public notEmpty(options?: CheckOptions): this {
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (this.data === null || this.data === undefined) {
            this.errorMessage(prefix + ' is required', options);
            return this;
        }
        if (Object.keys(this.data).length === 0) {
            this.errorMessage(prefix + ' must not be empty', options);
        }
        return this;
    }

    public object(options?: CheckOptions): this {
        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';

        if (Array.isArray(this.data)) {
            this.errorMessage(prefix + ' must not be an array.', options);
            return this;
        }
        if (typeof this.data !== 'object') {
            this.errorMessage(prefix + ' must be an object.', options);
            return this;
        }
        return this;
    }

    public required(name: string, options?: CheckOptions): FieldCheck {
        this.known_keys.add(name);
        return new FieldCheck(name, this.data).required(options);
    }

    public optional(name: string): FieldCheck {
        this.known_keys.add(name);
        return new FieldCheck(name, this.data);
    }

    public conditional(name: string, condition: (data: any) => boolean, options?: CheckOptions): FieldCheck {
        this.known_keys.add(name);
        if (condition(this.data)) {
            return new FieldCheck(name, this.data).required(options);
        } else {
            return new FieldCheck(name, this.data);
        }
    }

    public noExtraFields(options?: CheckOptions): this {
        this.check_extra_fields = true;
        return this;
    }

    private checkExtraFields(options?: CheckOptions): this {
        if (!this.is_object) return this;

        const prefix = defined(this.key) ? `Field ${this.key}` : 'Input';
        const unknown_keys = Object.keys(this.data).filter(k => !this.known_keys.has(k));

        if (unknown_keys.length > 0) {
            this.errorMessage(prefix + ` has extra fields: ${unknown_keys.join(', ')}`, options);
        }
        this.check_extra_fields = false;
        return this;
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

    public result(options?: ResultOptions): IResult {
        // ensure overall validity is false if any part is invalid
        for (const part of this.out.results || []) {
            if (!part.valid) {
                this.out.valid = false;
                break;
            }
        }
        // Check for extra fields if that option is enabled
        if (this.check_extra_fields) {
            this.checkExtraFields();
        }

        // format output based on options
        return collectResults(this.data, this.out, options);
    }

}