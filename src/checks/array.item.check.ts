import type { Check, CheckOptions, EqualityCheckOptions, TolerantCheckOptions } from '../types';
import type { ClassValidationOptions } from '../decorators/decorator.factory';
import { appendError } from './helper.functions';
import { NumberCheck } from './number.check';
import { StringCheck } from './string.check';
import { ValueCheck } from './value.check';
import { DateCheck } from './date.check';
import { ObjectCheck } from './object.check';
import { ArrayCheck } from './array.check';
import { FieldCheck } from './field.check';

export class ArrayItemCheck extends ValueCheck {

    private item: any;

    constructor(key: number, data: unknown) {
        super(key, data);

        this.item = (data && typeof data === 'object') ? (data as any)[key] : null;
    }

    public object(): ObjectCheck {
        return new ObjectCheck(this.key, this.data)
            .updating(this.oldData)
            .inherit(this.out);
    }

    public async matchesType<T>(
        type: abstract new (...args: any[]) => T,
        options?: ClassValidationOptions,
    ): Promise<ObjectCheck> {
        return this.object().matchesType(type, options);
    }

    public required(name: string, options?: CheckOptions): FieldCheck {
        return new FieldCheck(name, this.item)
            .updating(this.oldData?.[this.key])
            .required(options);
    }

    public optional(name: string): FieldCheck {
        return new FieldCheck(name, this.item)
            .updating(this.oldData?.[this.key]);
    }

    public conditional(name: string, condition: (data: any) => boolean, options?: CheckOptions): FieldCheck {
        if (condition(this.item)) {
            return new FieldCheck(name, this.item)
                .updating(this.oldData?.[this.key])
                .required(options);
        } else {
            return new FieldCheck(name, this.item)
                .updating(this.oldData?.[this.key]);
        }
    }

    public array(): ArrayCheck {
        return new ArrayCheck(this.key, this.data)
            .updating(this.oldData)
            .inherit(this.out);
    }

    public string(): StringCheck {
        return new StringCheck(this.key, this.data)
            .updating(this.oldData)
            .inherit(this.out);
    }

    public number(options?: TolerantCheckOptions): NumberCheck {
        return new NumberCheck(this.key, this.data, options)
            .updating(this.oldData)
            .inherit(this.out);
    }

    public date(): DateCheck {
        return new DateCheck(this.key, this.data)
            .updating(this.oldData)
            .inherit(this.out);
    }

    public boolean(): ArrayItemCheck {
        if (!this.has_value) return this;

        if (typeof this.data[this.key] !== 'boolean') {
            this.out = appendError(this.out, `Item ${this.key} must be a boolean`);
        }
        return this;
    }

    public equals(expected: unknown, options?: EqualityCheckOptions): this {
        if (!this.has_value) return this;

        if (!this.equalityMatches(this.data[this.key], expected, options)) {
            this.errorMessage(`Item ${this.key} must equal ${JSON.stringify(expected)}`, options);
        }

        return this;
    }

    protected updateTarget(): string {
        return `Item ${this.key}`;
    }

    /**
     * Runs a group of item-level checks where all returned checks must pass.
     *
     * All returned checks must pass for the composed result to stay valid.
     *
     * @example
     * ```ts
     * const checker = await ObjectCheck.for({ values: ['Ada'] }).check(root => [
     *   root.required('values').array().checkEach(item => [
     *     item.allOf(entry => [entry.string().minLength(2)])
     *   ])
     * ]);
     * ```
     */
    public async allOf(func: (checker: ArrayItemCheck) => (Check | Promise<Check>)[]): Promise<this> {
        await this.rules(func(this));
        return this;
    }

    /**
     * Evaluates alternative item branches and succeeds when at least one branch is valid.
     *
     * Each branch function is evaluated in isolation using cloned parent array data.
     * Valid branches are then replayed on the current checker so mutations behave
     * the same way as normal non-branch checks.
     *
     * @example
     * ```ts
     * const checker = await ObjectCheck.for({ values: ['  Ada  '] }).check(root => [
     *   root.required('values').array().checkEach(item => [
     *     item.anyOf([
     *       entry => [entry.string().trim().minLength(2)],
     *       entry => [entry.number().greaterThan(10)]
     *     ])
     *   ])
     * ]);
     * ```
     */
    public async anyOf(branches: Array<(checker: ArrayItemCheck) => (Check | Promise<Check>)[]>): Promise<this> {
        return this.composeAlternatives('anyOf', branches);
    }

    /**
     * Evaluates alternative item branches and succeeds only when exactly one branch is valid.
     *
     * Each branch function is evaluated in isolation using cloned parent array data.
     * The single winning branch is then replayed on the current checker so
     * mutations behave the same way as normal non-branch checks.
     */
    public async oneOf(branches: Array<(checker: ArrayItemCheck) => (Check | Promise<Check>)[]>): Promise<this> {
        return this.composeAlternatives('oneOf', branches);
    }
}