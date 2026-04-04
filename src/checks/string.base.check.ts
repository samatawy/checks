import type { CheckOptions, EqualityCheckOptions, StringCheckOptions } from '../types';
import { ValueCheck } from './value.check';

export abstract class StringBaseCheck extends ValueCheck {

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

    public trim(): this {
        if (this.valid_type) {
            this.data[this.key] = this.data[this.key].trim();
        }
        return this;
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

    public equalsOneOf(values: string[], options?: StringCheckOptions): this {
        if (!this.valid_type) return this;

        const this_str = options?.case === 'insensitive' ? this.data[this.key].toLowerCase() : this.data[this.key];
        const values_str = options?.case === 'insensitive' ? values.map(v => v.toLowerCase()) : values;

        if (!values_str.includes(this_str)) {
            this.errorMessage(`Field ${this.key} must be one of the following values: ${values.join(', ')}`, options);
        }
        return this;
    }

    public equals(expected: unknown, options?: EqualityCheckOptions): this {
        if (!this.valid_type) return this;

        if (!this.equalityMatches(this.data[this.key], expected, options)) {
            this.errorMessage(`Field ${this.key} must equal ${JSON.stringify(expected)}`, options);
        }

        return this;
    }

    public startsWith(prefix: string, options?: StringCheckOptions): this {
        if (!this.valid_type) return this;

        const this_str = options?.case === 'insensitive' ? this.data[this.key].toLowerCase() : this.data[this.key];
        const sub_str = options?.case === 'insensitive' ? prefix.toLowerCase() : prefix;

        if (!this_str.startsWith(sub_str)) {
            this.errorMessage(`Field ${this.key} must start with ${prefix}`, options);
        }
        return this;
    }

    public endsWith(suffix: string, options?: StringCheckOptions): this {
        if (!this.valid_type) return this;

        const this_str = options?.case === 'insensitive' ? this.data[this.key].toLowerCase() : this.data[this.key];
        const sub_str = options?.case === 'insensitive' ? suffix.toLowerCase() : suffix;

        if (!this_str.endsWith(sub_str)) {
            this.errorMessage(`Field ${this.key} must end with ${suffix}`, options);
        }
        return this;
    }

    public contains(substring: string, options?: StringCheckOptions): this {
        if (!this.valid_type) return this;

        const this_str = options?.case === 'insensitive' ? this.data[this.key].toLowerCase() : this.data[this.key];
        const sub_str = options?.case === 'insensitive' ? substring.toLowerCase() : substring;

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