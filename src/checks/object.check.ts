import type { Check, CheckOptions, IResult, ResultSet, ResultOptions } from '../types';
import type { DecoratedValidationOptions } from '../decorators/decorator.factory';
import { validateDecoratedClass } from '../decorators/decorator.factory';
import { ArrayCheck } from './array.check';
import { FieldCheck } from './field.check';
import { defined, buildErrorMessage, appendError, isPromise } from './helper.functions';
import { collectResults } from './helper.functions';

/**
 * Validates object-shaped input and coordinates checks for its fields.
 *
 * Use this class when the input should be an object and individual fields
 * need their own validation rules.
 *
 * @example
 * ```ts
 * const result = await ObjectCheck.for({ name: 'Ada' })
 *   .check(checker => [
 *     checker.required('name').notEmpty()
 *   ])
 *   .then(checker => checker.result({ nested: true }));
 * ```
 */
export class ObjectCheck implements Check {

    protected key: string | number | null | undefined;

    protected data: any;

    protected has_value: boolean;

    protected is_object: boolean;

    protected check_extra_fields: boolean;

    protected known_keys: Set<string>;

    protected out: ResultSet;

    /**
     * Creates an object checker for a top-level input value.
     *
     * @example
     * ```ts
     * const checker = ObjectCheck.for({ email: 'user@example.com' });
     * ```
     */
    static for(data: any): ObjectCheck {
        return new ObjectCheck(null, data);
    }

    /**
     * Creates an object checker for a value or for a named field within a parent object.
     *
     * When both `key` and `data` are provided, the checker reads `data[key]`.
     */
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

    /**
     * Requires the value to exist and contain at least one key.
     *
     * @example
     * ```ts
     * const result = ObjectCheck.for({}).notEmpty().result();
     * ```
     */
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

    /**
     * Requires the value to be a non-array object.
     *
     * This check runs automatically during construction when a value is present.
     */
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

    /**
     * Returns a checker for a required field and marks that field as known.
     *
     * Known fields are used later by {@link noExtraFields}.
     *
     * @example
     * ```ts
     * const nameCheck = ObjectCheck.for({ name: 'Ada' }).required('name');
     * ```
     */
    public required(name: string, options?: CheckOptions): FieldCheck {
        this.known_keys.add(name);
        return new FieldCheck(name, this.data).required(options);
    }

    /**
     * Returns a checker for an optional field and marks that field as known.
     *
     * @example
     * ```ts
     * const nicknameCheck = ObjectCheck.for({}).optional('nickname');
     * ```
     */
    public optional(name: string): FieldCheck {
        this.known_keys.add(name);
        return new FieldCheck(name, this.data);
    }

    /**
     * Returns a field checker that becomes required only when `condition` passes.
     *
     * The condition receives the current object value.
     *
     * @example
     * ```ts
     * const checker = ObjectCheck.for({ type: 'person' });
     * checker.conditional('name', data => data.type === 'person').notEmpty();
     * ```
     */
    public conditional(name: string, condition: (data: any) => boolean, options?: CheckOptions): FieldCheck {
        this.known_keys.add(name);
        if (condition(this.data)) {
            return new FieldCheck(name, this.data).required(options);
        } else {
            return new FieldCheck(name, this.data);
        }
    }

    /**
     * Fails when the input contains keys that were not declared through
     * {@link required}, {@link optional}, or {@link conditional}.
     *
     * The extra-field check is evaluated when {@link result} is called.
     *
     * @example
     * ```ts
     * const result = ObjectCheck.for({ name: 'Ada', extra: true })
     *   .required('name')
     *   .noExtraFields()
     *   .result();
     * ```
     */
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

            const extraResults = unknown_keys.map(key => {
                const message = defined(this.key)
                    ? `Field ${this.key}.${key} is not allowed`
                    : `Field ${key} is not allowed`;

                return {
                    ...buildErrorMessage(message, options),
                    field: key,
                };
            });

            this.out.results = [...(this.out.results ?? []), ...extraResults];
            this.out.valid = false;
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

            if (found.hint || found.warn || found.err || (found as ResultSet).results?.length) {
                this.out.results = this.out.results || [];
                this.out.results.push(found);
            }
            if (found.err) {
                this.out.valid = false;
            }
        }
        return this;
    }

    /**
     * Runs a group of field or nested checks and merges their results.
     *
     * Return an array of checks from the callback. Each check can be synchronous
     * or a promise.
     *
     * @example
     * ```ts
     * const checker = await ObjectCheck.for({ name: 'Ada', age: 37 }).check(c => [
     *   c.required('name').notEmpty(),
     *   c.optional('age').number()
     * ]);
     * ```
     */
    public async check(func: (checker: ObjectCheck) => (Check | Promise<Check>)[]): Promise<this> {
        const field_checks = func(this);
        await this.rules(field_checks);
        return this;
    }

    /**
    * Validates the current object value against a decorated class definition.
     *
     * This merges the decorated-class result into the current checker so it can
     * be composed with fluent object rules.
     *
     * @example
     * ```ts
     * const checker = await ObjectCheck.for(payload).matchesType(PersonDto);
     * ```
     */
    public async matchesType<T>(
        type: abstract new (...args: any[]) => T,
        options?: DecoratedValidationOptions,
    ): Promise<this> {
        const decorated = await validateDecoratedClass(this.data, type, options);
        this.mergeDecoratedResult(decorated.result() as ResultSet);
        return this;
    }

    /**
     * Applies a custom predicate to the current object value.
     *
     * When the predicate returns `false`, the result contains `Custom check failed`
     * unless custom check options override the message or code.
     *
     * @example
     * ```ts
     * const checker = await ObjectCheck.for({ role: 'admin' })
     *   .isTrue(data => data.role === 'admin');
     * ```
     */
    public async isTrue(func: (data: any) => boolean | Promise<boolean>, options?: CheckOptions): Promise<ObjectCheck> {
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

    private mergeDecoratedResult(result: ResultSet): void {
        if (defined(result.hint)) {
            this.out.hint = this.mergeMessageValue(this.out.hint, result.hint);
        }
        if (defined(result.warn)) {
            this.out.warn = this.mergeMessageValue(this.out.warn, result.warn);
        }
        if (defined(result.err)) {
            this.out.err = this.mergeMessageValue(this.out.err, result.err);
            this.out.valid = false;
        }
        if (defined(result.code) && !defined(this.out.code)) {
            this.out.code = result.code;
        }
        if (result.results?.length) {
            this.out.results = [...(this.out.results ?? []), ...result.results];
        }
        if (!result.valid) {
            this.out.valid = false;
        }
    }

    private mergeMessageValue(
        current?: string | string[],
        incoming?: string | string[],
    ): string | string[] | undefined {
        const values = this.toArray(current);
        values.push(...this.toArray(incoming));

        if (values.length === 0) {
            return undefined;
        }

        return values.length === 1 ? values[0] : values;
    }

    private toArray(value?: string | string[]): string[] {
        if (!defined(value)) {
            return [];
        }

        return Array.isArray(value) ? [...value] : [value];
    }

    /**
     * Merges a prior result into this checker when that prior result is invalid.
     *
     * This is useful when composing validations from external sources.
     */
    public inherit(priors: IResult): this {
        if (!priors.valid) {
            this.out = { ...this.out, ...priors };
        }
        return this;
    }

    /**
     * Returns the validation result for the current object.
     *
     * With no options, this returns the raw internal result structure. With
     * options, the output is formatted through the package result helpers.
     *
     * @example
     * ```ts
     * const result = await ObjectCheck.for({ name: 'Ada' })
     *   .check(c => [c.required('name').notEmpty()])
     *   .then(c => c.result({ nested: true }));
     * ```
     */
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

        if (!options || Object.keys(options).length === 0) {
            return this.out;
        }

        // format output based on options
        return collectResults(this.data, this.out, options);
    }

}