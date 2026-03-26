import type { CheckOptions, StringCheckOptions } from './types';
import { ValueCheck } from './value.check';

export class StringCheck extends ValueCheck {

    protected valid_type: boolean;

    constructor(key: string | number, data: any) {
        super(key, data);
        if (this.has_value) {
            this.valid_type = typeof this.data[this.key] === 'string';

            if (!this.valid_type) {
                this.out = { ...this.out, ...{ valid: false, err: `Field ${this.key} must be a string` } };
            }
        } else {
            this.valid_type = false;
        }
    }

    public minLength(length: number, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (this.data[this.key].length < length) {
            this.errorMessage(`Field ${this.key} must be at least ${length} characters long`, options);
        }
        return this;
    }

    public maxLength(length: number, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (this.data[this.key].length > length) {
            this.errorMessage(`Field ${this.key} must be at most ${length} characters long`, options);
        }
        return this;
    }

    public oneOf(values: string[], options?: StringCheckOptions): this {
        if (!this.valid_type) return this;

        const this_str = options?.case === 'insensitive' ? this.data[this.key] : this.data[this.key].toLowerCase();
        const values_str = options?.case === 'insensitive' ? values : values.map(v => v.toLowerCase());

        if (!values_str.includes(this_str)) {
            this.errorMessage(`Field ${this.key} must be one of the following values: ${values.join(', ')}`, options);
        }
        return this;
    }

    public startsWith(prefix: string, options?: StringCheckOptions): this {
        if (!this.valid_type) return this;

        const this_str = options?.case === 'insensitive' ? this.data[this.key] : this.data[this.key].toLowerCase();
        const sub_str = options?.case === 'insensitive' ? prefix : prefix.toLowerCase();

        if (!this_str.startsWith(sub_str)) {
            this.errorMessage(`Field ${this.key} must start with ${prefix}`, options);
        }
        return this;
    }

    public endsWith(suffix: string, options?: StringCheckOptions): this {
        if (!this.valid_type) return this;

        const this_str = options?.case === 'insensitive' ? this.data[this.key] : this.data[this.key].toLowerCase();
        const sub_str = options?.case === 'insensitive' ? suffix : suffix.toLowerCase();

        if (!this_str.endsWith(sub_str)) {
            this.errorMessage(`Field ${this.key} must end with ${suffix}`, options);
        }
        return this;
    }

    public contains(substring: string, options?: StringCheckOptions): this {
        if (!this.valid_type) return this;

        const this_str = options?.case === 'insensitive' ? this.data[this.key] : this.data[this.key].toLowerCase();
        const sub_str = options?.case === 'insensitive' ? substring : substring.toLowerCase();

        if (!this_str.includes(sub_str)) {
            this.errorMessage(`Field ${this.key} must contain ${substring}`, options);
        }

        return this;
    }

    public pattern(regex: RegExp, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (!regex.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} does not match the required pattern`, options);
        }
        return this;
    }
}