import type { CheckOptions } from './types';
import { ValueCheck } from './value.check';

export class NumberCheck extends ValueCheck {

    protected valid_type: boolean;

    protected value?: number;

    constructor(key: string | number, data: any) {
        super(key, data);

        if (this.has_value) {
            this.valid_type = typeof this.data[this.key] === 'number';
            if (this.valid_type) {
                this.value = this.data[this.key];
            }
            else {
                this.errorMessage(`Field ${this.key} must be a number`);
            }
        } else {
            this.valid_type = false;
        }
    }

    private getValue(value: number | string): number | null {
        if (typeof value === 'number') {
            return value;
        }
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
            const found = this.data[value];
            if (typeof found === 'number') {
                return found;
            } else {
                return null;
            }
        }
        return parsed;
    }

    public greaterThan(value: number | string, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        const otherValue = this.getValue(value);
        if (otherValue === null) {
            this.errorMessage(`Value ${value} is not a valid number`, options);
            return this;
        }

        if (this.value! <= otherValue) {
            this.errorMessage(`Field ${this.key} must be a number greater than ${value}`, options);
        }
        return this;
    }

    public lessThan(value: number | string, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        const otherValue = this.getValue(value);
        if (otherValue === null) {
            this.errorMessage(`Value ${value} is not a valid number`, options);
            return this;
        }

        if (this.value! >= otherValue) {
            this.errorMessage(`Field ${this.key} must be a number less than ${value}`, options);
        }
        return this;
    }

    public atLeast(value: number | string, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        const otherValue = this.getValue(value);
        if (otherValue === null) {
            this.errorMessage(`Value ${value} is not a valid number`, options);
            return this;
        }

        if (this.value! < otherValue) {
            this.errorMessage(`Field ${this.key} must be a number at least ${value}`, options);
        }
        return this;
    }

    public atMost(value: number | string, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        const otherValue = this.getValue(value);
        if (otherValue === null) {
            this.errorMessage(`Value ${value} is not a valid number`, options);
            return this;
        }

        if (this.value! > otherValue) {
            this.errorMessage(`Field ${this.key} must be a number at most ${value}`, options);
        }
        return this;
    }
}