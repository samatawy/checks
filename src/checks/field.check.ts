import type { Check, CheckOptions, EqualityCheckOptions, TolerantCheckOptions, UUIDCheckOptions } from '../types';
import type { ClassValidationOptions } from '../decorators/decorator.factory';
import { appendError } from "./helper.functions";

import { NumberCheck } from './number.check';
import { StringCheck } from './string.check';
import { EmailCheck } from './email.check';
import { UrlCheck } from './url.check';
import { UUIDCheck } from './uuid.check';
import { ValueCheck } from './value.check';
import { DateCheck } from './date.check';
import { ObjectCheck } from './object.check';
import { ArrayCheck } from './array.check';
import { FileCheck } from './file.check';
import { ImageCheck } from './image.check';

export class FieldCheck extends ValueCheck {

    constructor(key: string | number, data: any) {
        super(key, data);
    }

    public required(options?: CheckOptions): this {
        if (this.data === null || this.data === undefined ||
            this.key === null || this.key === undefined ||
            this.data[this.key] === null || this.data[this.key] === undefined) {
            this.out = appendError(this.out, `Field ${this.key} is required`, options);
        }
        return this;
    }

    public object(): ObjectCheck {
        return new ObjectCheck(this.key, this.data).inherit(this.out);
    }

    public async matchesType<T>(
        type: abstract new (...args: any[]) => T,
        options?: ClassValidationOptions,
    ): Promise<ObjectCheck> {
        return this.object().matchesType(type, options);
    }

    public array(): ArrayCheck {
        return new ArrayCheck(this.key, this.data).inherit(this.out);
    }

    public async file(): Promise<FileCheck> {
        return (await FileCheck.for(this.key, this.data)).inherit(this.out);
    }

    public async image(): Promise<ImageCheck> {
        return (await ImageCheck.for(this.key, this.data)); //.inherit(this.out);
    }

    public string(): StringCheck {
        return new StringCheck(this.key, this.data).inherit(this.out);
    }

    public email(): EmailCheck {
        return new EmailCheck(this.key, this.data).inherit(this.out);
    }

    public url(): UrlCheck {
        return new UrlCheck(this.key, this.data).inherit(this.out);
    }

    public uuid(options?: UUIDCheckOptions): UUIDCheck {
        return new UUIDCheck(this.key, this.data, 'uuid', options).inherit(this.out);
    }

    public ulid(options?: CheckOptions): UUIDCheck {
        return new UUIDCheck(this.key, this.data, 'ulid', options).inherit(this.out);
    }

    public number(options?: TolerantCheckOptions): NumberCheck {
        return new NumberCheck(this.key, this.data, options).inherit(this.out);
    }

    public date(): DateCheck {
        return new DateCheck(this.key, this.data).inherit(this.out);
    }

    public boolean(options?: TolerantCheckOptions): FieldCheck {
        if (!this.has_value) return this;

        const tolerant = options?.tolerant ?? false;
        if (typeof this.data[this.key] === 'boolean') {
            return this;
        }
        else if (tolerant && typeof this.data[this.key] === 'string') {
            const value = this.data[this.key].toLowerCase();
            if (value === 'true' || value === 'false') {
                this.data[this.key] = value === 'true';
                return this;
            } else {
                this.out = appendError(this.out, `Field ${this.key} must be a boolean string ('true' or 'false')`, options);
            }
        }
        else {
            this.out = appendError(this.out, `Field ${this.key} must be a boolean`, options);
        }

        return this;
    }

    public equals(expected: unknown, options?: EqualityCheckOptions): this {
        if (!this.has_value) return this;

        if (!this.equalityMatches(this.data[this.key], expected, options)) {
            this.errorMessage(`Field ${this.key} must equal ${JSON.stringify(expected)}`, options);
        }

        return this;
    }

    /**
     * Runs a group of field-level checks where all returned checks must pass.
     *
     * All returned checks must pass for the composed result to stay valid.
     *
     * @example
     * ```ts
     * const checker = await ObjectCheck.for({ age: '37' }).check(root => [
     *   root.required('age').allOf(field => [
     *     field.number({ tolerant: true }).greaterThan(17)
     *   ])
     * ]);
     * ```
     */
    public async allOf(func: (checker: FieldCheck) => (Check | Promise<Check>)[]): Promise<this> {
        await this.rules(func(this));
        return this;
    }

    /**
     * Evaluates alternative field branches and succeeds when at least one branch is valid.
     *
     * Each branch function is evaluated in isolation using cloned parent data.
     * Valid branches are then replayed on the current checker so mutations behave
     * the same way as normal non-branch checks.
     *
     * @example
     * ```ts
     * const checker = await ObjectCheck.for({ value: '37' }).check(root => [
     *   root.required('value').anyOf([
     *     field => [field.number({ tolerant: true }).greaterThan(10)],
     *     field => [field.string().minLength(5)]
     *   ])
     * ]);
     * ```
     */
    public async anyOf(branches: Array<(checker: FieldCheck) => (Check | Promise<Check>)[]>): Promise<this> {
        return this.composeAlternatives('anyOf', branches);
    }

    /**
     * Evaluates alternative field branches and succeeds only when exactly one branch is valid.
     *
     * Each branch function is evaluated in isolation using cloned parent data.
     * The single winning branch is then replayed on the current checker so
     * mutations behave the same way as normal non-branch checks.
     */
    public async oneOf(branches: Array<(checker: FieldCheck) => (Check | Promise<Check>)[]>): Promise<this> {
        return this.composeAlternatives('oneOf', branches);
    }

}