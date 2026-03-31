import type { CheckOptions, TolerantCheckOptions } from '../types';
import { ValueCheck } from './value.check';

export class NumberCheck extends ValueCheck {

    protected valid_type: boolean;

    protected value?: number;

    constructor(key: string | number, data: any, options?: TolerantCheckOptions) {
        super(key, data);

        if (this.has_value) {
            const tolerant = options?.tolerant ?? false;
            if (typeof this.data[this.key] === 'number') {
                // Valid number
                this.valid_type = true;
                this.value = this.data[this.key];
            }
            else if (tolerant && typeof this.data[this.key] === 'string') {
                // Accept string that can be parsed as number
                const parsed = parseFloat(this.data[this.key]);
                if (isNaN(parsed)) {
                    this.valid_type = false;
                    this.errorMessage(`Field ${this.key} must be a number`, options);
                } else {
                    this.valid_type = true;
                    this.value = parsed;
                    this.data[this.key] = parsed; // Update the original data with the parsed number
                }
            } else {
                // Only numbers and parseable string allowed
                this.valid_type = false;
                this.errorMessage(`Field ${this.key} must be a number`, options);
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

    public integer(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (!Number.isInteger(this.value)) {
            this.errorMessage(`Field ${this.key} must be an integer`, options);
        }
        return this;
    }

    public minPrecision(decimalPlaces: number, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        const valueStr = this.value!.toString();
        const decimalPart = valueStr.split('.')[1];
        const actualDecimalPlaces = decimalPart ? decimalPart.length : 0;

        if (actualDecimalPlaces < decimalPlaces) {
            this.errorMessage(`Field ${this.key} must have at least ${decimalPlaces} decimal places`, options);
        }
        return this;
    }

    public positive(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (this.value! <= 0) {
            this.errorMessage(`Field ${this.key} must be a positive number`, options);
        }
        return this;
    }

    public negative(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (this.value! >= 0) {
            this.errorMessage(`Field ${this.key} must be a negative number`, options);
        }
        return this;
    }

    public nonNegative(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (this.value! < 0) {
            this.errorMessage(`Field ${this.key} must not be a negative number`, options);
        }
        return this;
    }

    public roundUp(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        this.data[this.key] = Math.ceil(this.value!);
        return this;
    }

    public roundDown(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        this.data[this.key] = Math.floor(this.value!);
        return this;
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