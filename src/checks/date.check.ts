import type { CheckOptions, EqualityCheckOptions } from '../types';
import { ValueCheck } from './value.check';

export class DateCheck extends ValueCheck {

    protected date?: Date;

    constructor(key: string | number, data: unknown) {
        super(key, data);

        if (this.has_value) {
            try {
                this.date = new Date(this.data[this.key]);

            } catch (e) {
                this.errorMessage(`Field ${this.key} must be a valid date`);
            }

        } else {
        }
    }

    private safeParseDate(input: unknown): Date | null {
        if (typeof input === 'bigint') return null;

        const date = new Date(input as any);

        if (isNaN(date.getTime())) {
            return null;
        }

        return date;
    }

    private getDate(value: Date | number | string): Date | null {
        if (value instanceof Date) {
            if (isNaN(value.getTime())) {
                return null;
            }
            return value;
        }

        const parsed = this.safeParseDate(value);
        if (parsed) {
            return parsed;
        } else {
            return this.safeParseDate(this.data[value]);
        }
    }

    public equals(expected: unknown, options?: EqualityCheckOptions): this {
        if (!(this.date instanceof Date) || isNaN(this.date.getTime())) return this;

        if (!(expected instanceof Date) && typeof expected !== 'number' && typeof expected !== 'string') {
            this.errorMessage(`Field ${this.key} must equal ${JSON.stringify(expected)}`, options);
            return this;
        }

        const otherDate = this.getDate(expected);
        if (otherDate === null) {
            this.errorMessage(`Value ${expected} is not a valid date`, options);
            return this;
        }

        if (this.date.getTime() !== otherDate.getTime()) {
            this.errorMessage(`Field ${this.key} must equal ${JSON.stringify(expected)}`, options);
        }

        return this;
    }

    public after(value: Date | string | number, options?: CheckOptions): this {
        if (!this.date) return this;

        const otherDate = this.getDate(value);
        if (otherDate === null) {
            this.errorMessage(`Value ${value} is not a valid date`);
            return this;
        }

        if (this.date <= otherDate) {
            this.errorMessage(`Field ${this.key} must be a date after ${value}`,
                options);
        }
        return this;
    }

    public before(value: Date | number | string, options?: CheckOptions): this {
        if (!this.date) return this;

        const otherDate = this.getDate(value);
        if (otherDate === null) {
            this.errorMessage(`Value ${value} is not a valid date`);
            return this;
        }

        if (this.date >= otherDate) {
            this.errorMessage(`Field ${this.key} must be a date before ${value}`,
                options);
        }
        return this;
    }

    public sameDay(value: Date | number | string, options?: CheckOptions): this {
        if (!this.date) return this;

        const otherDate = this.getDate(value);
        if (otherDate === null) {
            this.errorMessage(`Value ${value} is not a valid date`);
            return this;
        }

        if (this.date.toDateString() !== otherDate.toDateString()) {
            this.errorMessage(`Field ${this.key} must be a date on the same day as ${value}`,
                options);
        }
        return this;
    }

    public sameMonth(value: Date | number | string, options?: CheckOptions): this {
        if (!this.date) return this;

        const otherDate = this.getDate(value);
        if (otherDate === null) {
            this.errorMessage(`Value ${value} is not a valid date`);
            return this;
        }

        if (this.date.getFullYear() !== otherDate.getFullYear() || this.date.getMonth() !== otherDate.getMonth()) {
            this.errorMessage(`Field ${this.key} must be a date in the same month as ${value}`,
                options);
        }
        return this;
    }

    public sameYear(value: Date | number | string, options?: CheckOptions): this {
        if (!this.date) return this;

        const otherDate = this.getDate(value);
        if (otherDate === null) {
            this.errorMessage(`Value ${value} is not a valid date`);
            return this;
        }

        if (this.date.getFullYear() !== otherDate.getFullYear()) {
            this.errorMessage(`Field ${this.key} must be a date in the same year as ${value}`,
                options);
        }
        return this;
    }

    public withinMinutes(value: Date | number | string, expectedDifference: number, options?: CheckOptions): this {
        if (!this.date) return this;

        const otherDate = this.getDate(value);
        if (otherDate === null) {
            this.errorMessage(`Value ${value} is not a valid date`);
            return this;
        }

        const diffInMs = Math.abs(this.date.getTime() - otherDate.getTime());
        const diffInMinutes = diffInMs / (1000 * 60);

        if (diffInMinutes !== expectedDifference) {
            this.errorMessage(`Field ${this.key} must be a date that is ${expectedDifference} minutes away from ${value}`,
                options);
        }
        return this;
    }

    public withinHours(value: Date | number | string, expectedDifference: number, options?: CheckOptions): this {
        if (!this.date) return this;

        const otherDate = this.getDate(value);
        if (otherDate === null) {
            this.errorMessage(`Value ${value} is not a valid date`);
            return this;
        }

        const diffInMs = Math.abs(this.date.getTime() - otherDate.getTime());
        const diffInHours = diffInMs / (1000 * 60 * 60);

        if (diffInHours !== expectedDifference) {
            this.errorMessage(`Field ${this.key} must be a date that is ${expectedDifference} hours away from ${value}`,
                options);
        }
        return this;
    }

    public withinDays(value: Date | number | string, expectedDifference: number, options?: CheckOptions): this {
        if (!this.date) return this;

        const otherDate = this.getDate(value);
        if (otherDate === null) {
            this.errorMessage(`Value ${value} is not a valid date`);
            return this;
        }

        const diffInMs = Math.abs(this.date.getTime() - otherDate.getTime());
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        if (diffInDays !== expectedDifference) {
            this.errorMessage(`Field ${this.key} must be a date that is ${expectedDifference} days away from ${value}`,
                options);
        }
        return this;
    }

    public withinMonths(value: Date | number | string, expectedDifference: number, options?: CheckOptions): this {
        if (!this.date) return this;

        const otherDate = this.getDate(value);
        if (otherDate === null) {
            this.errorMessage(`Value ${value} is not a valid date`);
            return this;
        }

        const diffInMonths = (this.date.getFullYear() - otherDate.getFullYear()) * 12 + (this.date.getMonth() - otherDate.getMonth());

        if (diffInMonths !== expectedDifference) {
            this.errorMessage(`Field ${this.key} must be a date that is ${expectedDifference} months away from ${value}`,
                options);
        }
        return this;
    }
}