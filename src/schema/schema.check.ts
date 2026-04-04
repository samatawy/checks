import { readFile } from 'node:fs/promises';

import type { Check, CheckOptions, IResult, ResultOptions } from '../types';
import { ObjectCheck } from '../checks/object.check';
import { FieldCheck } from '../checks/field.check';
import { ArrayCheck } from '../checks/array.check';
import { ArrayItemCheck } from '../checks/array.item.check';
import { buildErrorMessage, defined } from '../checks/helper.functions';

export type JsonSchemaTypeName = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';

export type JsonSchemaType = JsonSchemaTypeName | JsonSchemaTypeName[];

export interface JsonSchema {
    $schema?: string;
    $id?: string;
    title?: string;
    description?: string;
    default?: unknown;
    examples?: unknown[];

    type?: JsonSchemaType;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    additionalProperties?: boolean | JsonSchema;

    items?: JsonSchema | JsonSchema[];
    minItems?: number;
    maxItems?: number;

    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: string;

    enum?: unknown[];
    const?: unknown;

    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number | boolean;
    exclusiveMaximum?: number | boolean;
    multipleOf?: number;

    allOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    not?: JsonSchema;

    $ref?: string;
    $defs?: Record<string, JsonSchema>;
    definitions?: Record<string, JsonSchema>;
    patternProperties?: Record<string, JsonSchema>;
    propertyNames?: JsonSchema;
    if?: JsonSchema;
    then?: JsonSchema;
    else?: JsonSchema;
    contains?: JsonSchema;
    prefixItems?: JsonSchema[];
    dependentRequired?: Record<string, string[]>;
    dependentSchemas?: Record<string, JsonSchema>;
    unevaluatedProperties?: boolean | JsonSchema;
    unevaluatedItems?: boolean | JsonSchema;
}

export type SchemaSource = JsonSchema | string;

class StaticCheck implements Check {
    constructor(private readonly payload: IResult) {}

    public result(options?: ResultOptions): IResult {
        return options && Object.keys(options).length > 0 ? { ...this.payload } : this.payload;
    }
}

const PASS_CHECK = new StaticCheck({ valid: true });

/**
 * Builds an ObjectCheck from a standard JSON Schema object or JSON file path.
 *
 * Current support is intentionally limited to a reviewable subset of JSON Schema:
 * - root object schemas
 * - `type`, `properties`, `required`, `additionalProperties: false`
 * - `items`, `minItems`, `maxItems`
 * - `minLength`, `maxLength`, `pattern`, `format`, `enum`, `const`
 * - `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
 *
 * The class currently does not implement reference or conditional features such as
 * `$ref`, `if/then/else`, tuple arrays, or pattern-based property schemas.
 */
export class SchemaCheck {
    private readonly source: SchemaSource;

    constructor(source: SchemaSource) {
        this.source = source;
    }

    public static from(schema: JsonSchema): SchemaCheck {
        return new SchemaCheck(schema);
    }

    public static fromFile(filePath: string): SchemaCheck {
        return new SchemaCheck(filePath);
    }

    public async check(input: unknown): Promise<ObjectCheck> {
        const schema = await this.loadSchema();
        this.assertSupportedSchema(schema, []);

        if (!this.isRootObjectSchema(schema)) {
            throw new Error('SchemaCheck currently requires the root schema to be an object schema.');
        }

        const check = ObjectCheck.for(input);
        return this.applyObjectSchema(check, input, schema, []);
    }

    public async result(input: unknown, options?: ResultOptions): Promise<IResult> {
        const check = await this.check(input);
        return check.result(options);
    }

    private async loadSchema(): Promise<JsonSchema> {
        if (typeof this.source !== 'string') {
            return this.source;
        }

        const content = await readFile(this.source, 'utf8');
        return JSON.parse(content) as JsonSchema;
    }

    private async applyObjectSchema(
        check: ObjectCheck,
        value: unknown,
        schema: JsonSchema,
        path: string[],
    ): Promise<ObjectCheck> {
        if (schema.additionalProperties === false) {
            check.noExtraFields();
        }

        const currentValue = this.isPlainObject(value) ? value : undefined;
        const required = new Set(schema.required ?? []);
        const nestedChecks: Array<Check | Promise<Check>> = [];

        for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
            nestedChecks.push(
                this.buildPropertyCheck(currentValue, key, propertySchema, required.has(key), [...path, key]),
            );
        }

        if (nestedChecks.length > 0) {
            await check.check(() => nestedChecks);
        }

        if (schema.allOf?.length) {
            await check.allOf(current => schema.allOf!.map((branch, index) =>
                this.applyObjectSchema(current, this.getObjectCheckValue(current), branch, [...path, `allOf[${index}]`]),
            ));
        }

        if (schema.anyOf?.length) {
            await check.anyOf(schema.anyOf.map((branch, index) => current => [
                this.applyObjectSchema(current, this.getObjectCheckValue(current), branch, [...path, `anyOf[${index}]`]),
            ]));
        }

        if (schema.oneOf?.length) {
            await check.oneOf(schema.oneOf.map((branch, index) => current => [
                this.applyObjectSchema(current, this.getObjectCheckValue(current), branch, [...path, `oneOf[${index}]`]),
            ]));
        }

        if (schema.not) {
            await check.not(current => [
                this.applyObjectSchema(current, this.getObjectCheckValue(current), schema.not!, [...path, 'not']),
            ], {
                err: this.buildNotMessage(path),
            });
        }

        return check;
    }

    private async buildPropertyCheck(
        parent: Record<string, unknown> | undefined,
        key: string,
        schema: JsonSchema,
        required: boolean,
        path: string[],
    ): Promise<Check> {
        if (!parent || !Object.prototype.hasOwnProperty.call(parent, key)) {
            return required
                ? this.createFailureCheck(key, `Field ${key} is required`)
                : PASS_CHECK;
        }

        const value = parent[key];
        if (value === null && this.allowsNull(schema)) {
            return PASS_CHECK;
        }

        return this.applyFieldSchema(new FieldCheck(key, parent), value, schema, path);
    }

    private async applyFieldSchema(
        field: FieldCheck,
        value: unknown,
        schema: JsonSchema,
        path: string[],
    ): Promise<Check> {
        const checks: Array<Check | Promise<Check>> = [];
        const baseCheck = this.buildFieldBaseCheck(field, value, schema, path);

        if (baseCheck) {
            checks.push(baseCheck);
        }

        if (schema.allOf?.length) {
            checks.push(field.allOf(current => schema.allOf!.map((branch, index) =>
                this.applyFieldSchema(current, this.getFieldValue(current), branch, [...path, `allOf[${index}]`]),
            )));
        }

        if (schema.anyOf?.length) {
            checks.push(field.anyOf(schema.anyOf.map((branch, index) => current => [
                this.applyFieldSchema(current, this.getFieldValue(current), branch, [...path, `anyOf[${index}]`]),
            ])));
        }

        if (schema.oneOf?.length) {
            checks.push(field.oneOf(schema.oneOf.map((branch, index) => current => [
                this.applyFieldSchema(current, this.getFieldValue(current), branch, [...path, `oneOf[${index}]`]),
            ])));
        }

        if (checks.length === 0 && !schema.not) {
            return PASS_CHECK;
        }

        if (checks.length === 1 && !schema.not) {
            return checks[0]!;
        }

        if (checks.length > 0) {
            await field.allOf(() => checks);
        }

        if (schema.not) {
            await field.not(current => [
                this.applyFieldSchema(current, this.getFieldValue(current), schema.not!, [...path, 'not']),
            ], {
                err: this.buildNotMessage(path),
            });
        }

        return field;
    }

    private async applyArraySchema(
        check: ArrayCheck,
        value: unknown,
        schema: JsonSchema,
        path: string[],
    ): Promise<ArrayCheck> {
        if (defined(schema.minItems)) {
            check.minLength(schema.minItems);
        }
        if (defined(schema.maxItems)) {
            check.maxLength(schema.maxItems);
        }

        if (!Array.isArray(value) || !schema.items) {
            return check;
        }

        if (Array.isArray(schema.items)) {
            throw new Error(`Tuple-style array schemas are not supported at ${this.pathLabel(path)}.`);
        }

        await check.checkEach(item => [this.applyArrayItemSchema(item, schema.items as JsonSchema, path)]);

        if (schema.allOf?.length) {
            await check.allOf(current => schema.allOf!.map((branch, index) =>
                this.applyArraySchema(current, this.getArrayCheckValue(current), branch, [...path, `allOf[${index}]`]),
            ));
        }

        if (schema.anyOf?.length) {
            await check.anyOf(schema.anyOf.map((branch, index) => current => [
                this.applyArraySchema(current, this.getArrayCheckValue(current), branch, [...path, `anyOf[${index}]`]),
            ]));
        }

        if (schema.oneOf?.length) {
            await check.oneOf(schema.oneOf.map((branch, index) => current => [
                this.applyArraySchema(current, this.getArrayCheckValue(current), branch, [...path, `oneOf[${index}]`]),
            ]));
        }

        if (schema.not) {
            await check.not(current => [
                this.applyArraySchema(current, this.getArrayCheckValue(current), schema.not!, [...path, 'not']),
            ], {
                err: this.buildNotMessage(path),
            });
        }

        return check;
    }

    private async applyArrayItemSchema(
        item: ArrayItemCheck,
        schema: JsonSchema,
        path: string[],
    ): Promise<Check> {
        const checks: Array<Check | Promise<Check>> = [];
        const itemValue = this.getArrayItemValue(item);
        const baseCheck = this.buildArrayItemBaseCheck(item, itemValue, schema, path);

        if (baseCheck) {
            checks.push(baseCheck);
        }

        if (schema.allOf?.length) {
            checks.push(item.allOf(current => schema.allOf!.map((branch, index) =>
                this.applyArrayItemSchema(current, branch, [...path, `allOf[${index}]`]),
            )));
        }

        if (schema.anyOf?.length) {
            checks.push(item.anyOf(schema.anyOf.map((branch, index) => current => [
                this.applyArrayItemSchema(current, branch, [...path, `anyOf[${index}]`]),
            ])));
        }

        if (schema.oneOf?.length) {
            checks.push(item.oneOf(schema.oneOf.map((branch, index) => current => [
                this.applyArrayItemSchema(current, branch, [...path, `oneOf[${index}]`]),
            ])));
        }

        if (checks.length === 0 && !schema.not) {
            return PASS_CHECK;
        }

        if (checks.length === 1 && !schema.not) {
            return checks[0]!;
        }

        if (checks.length > 0) {
            await item.allOf(() => checks);
        }

        if (schema.not) {
            await item.not(current => [
                this.applyArrayItemSchema(current, schema.not!, [...path, 'not']),
            ], {
                err: this.buildNotMessage(path),
            });
        }

        return item;
    }

    private buildFieldBaseCheck(
        field: FieldCheck,
        value: unknown,
        schema: JsonSchema,
        path: string[],
    ): Check | Promise<Check> | undefined {
        const type = this.getPrimaryType(schema, path);

        switch (type) {
            case 'object':
                return this.applyObjectSchema(field.object(), value, schema, path);
            case 'array':
                return this.applyArraySchema(field.array(), value, schema, path);
            case 'string':
                return this.applyStringSchema(field, schema, path);
            case 'number':
            case 'integer':
                return this.applyNumberSchema(field, schema, type === 'integer', path);
            case 'boolean':
                return this.applyBooleanSchema(field, schema, path);
            case 'null':
                return value === null
                    ? PASS_CHECK
                    : this.createFailureCheck(String(field.result().field), `Field ${String(field.result().field)} must be null`);
            default:
                if (this.hasComposition(schema)) {
                    return undefined;
                }
                throw new Error(`Unsupported or missing schema type at ${this.pathLabel(path)}.`);
        }
    }

    private buildArrayItemBaseCheck(
        item: ArrayItemCheck,
        value: unknown,
        schema: JsonSchema,
        path: string[],
    ): Check | Promise<Check> | undefined {
        const type = this.getPrimaryType(schema, path);

        switch (type) {
            case 'object':
                return this.applyObjectSchema(item.object(), value, schema, path);
            case 'array':
                return this.applyArraySchema(item.array(), value, schema, path);
            case 'string':
                return this.applyStringItemSchema(item, schema, path);
            case 'number':
            case 'integer':
                return this.applyNumberItemSchema(item, schema, type === 'integer', path);
            case 'boolean':
                return this.applyBooleanItemSchema(item, schema, path);
            case 'null':
                return value === null
                    ? PASS_CHECK
                    : this.createFailureCheck(String(item.result().field), `Item ${String(item.result().field)} must be null`);
            default:
                if (this.hasComposition(schema)) {
                    return undefined;
                }
                throw new Error(`Unsupported array item schema at ${this.pathLabel(path)}.`);
        }
    }

    private applyStringSchema(field: FieldCheck, schema: JsonSchema, path: string[]): Check {
        const check = field.string();
        const key = String(check.result().field);

        if (defined(schema.minLength)) {
            check.minLength(schema.minLength);
        }
        if (defined(schema.maxLength)) {
            check.maxLength(schema.maxLength);
        }
        if (defined(schema.pattern)) {
            check.pattern(new RegExp(schema.pattern));
        }
        if (schema.enum) {
            this.ensureStringEnum(schema.enum, path);
            check.equalsOneOf(schema.enum as string[]);
        }
        if (defined(schema.const)) {
            check.equals(schema.const);
        }

        this.applyStringFormatCheck(check, key, schema.format, path);
        return check;
    }

    private applyStringItemSchema(item: ArrayItemCheck, schema: JsonSchema, path: string[]): Check {
        const check = item.string();
        const key = String(check.result().field);

        if (defined(schema.minLength)) {
            check.minLength(schema.minLength);
        }
        if (defined(schema.maxLength)) {
            check.maxLength(schema.maxLength);
        }
        if (defined(schema.pattern)) {
            check.pattern(new RegExp(schema.pattern));
        }
        if (schema.enum) {
            this.ensureStringEnum(schema.enum, path);
            check.equalsOneOf(schema.enum as string[]);
        }
        if (defined(schema.const)) {
            check.equals(schema.const, {
                err: `Item ${key} must equal ${JSON.stringify(schema.const)}`,
            });
        }

        this.applyStringFormatCheck(check, key, schema.format, path);
        return check;
    }

    private applyStringFormatCheck(
        check: ReturnType<FieldCheck['string']>,
        key: string,
        format: string | undefined,
        path: string[],
    ): void {
        if (!defined(format)) {
            return;
        }

        if (format === 'email') {
            check.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
                err: `Field ${key} must be a valid email address`,
            });
            return;
        }

        if (format === 'uri' || format === 'uri-reference') {
            check.isTrue(data => {
                const value = (data as Record<string, unknown>)[key];
                if (typeof value !== 'string') {
                    return false;
                }

                try {
                    new URL(value, 'https://example.test');
                    return true;
                } catch {
                    return false;
                }
            }, {
                err: `Field ${key} must be a valid URL`,
            });
            return;
        }

        throw new Error(`Unsupported string format \"${format}\" at ${this.pathLabel(path)}.`);
    }

    private applyNumberSchema(field: FieldCheck, schema: JsonSchema, integer: boolean, path: string[]): Check {
        const check = field.number();
        const key = String(check.result().field);

        if (integer) {
            check.integer();
        }
        if (defined(schema.minimum)) {
            check.atLeast(schema.minimum);
        }
        if (defined(schema.maximum)) {
            check.atMost(schema.maximum);
        }
        if (typeof schema.exclusiveMinimum === 'number') {
            check.greaterThan(schema.exclusiveMinimum);
        }
        if (typeof schema.exclusiveMaximum === 'number') {
            check.lessThan(schema.exclusiveMaximum);
        }
        if (defined(schema.multipleOf)) {
            check.isTrue(data => {
                const value = (data as Record<string, unknown>)[key];
                return typeof value === 'number' && Number.isFinite(value / schema.multipleOf!)
                    && Math.abs(Math.round(value / schema.multipleOf!) - (value / schema.multipleOf!)) < 1e-12;
            }, {
                err: `Field ${key} must be a multiple of ${schema.multipleOf}`,
            });
        }
        if (schema.enum) {
            check.isTrue(data => schema.enum!.includes((data as Record<string, unknown>)[key]), {
                err: `Field ${key} must be one of the allowed values`,
            });
        }
        if (defined(schema.const)) {
            check.equals(schema.const);
        }

        if (schema.exclusiveMinimum === true || schema.exclusiveMaximum === true) {
            throw new Error(`Boolean exclusive bounds are not supported at ${this.pathLabel(path)}.`);
        }

        return check;
    }

    private applyNumberItemSchema(item: ArrayItemCheck, schema: JsonSchema, integer: boolean, path: string[]): Check {
        const check = item.number();
        const key = String(check.result().field);

        if (integer) {
            check.integer();
        }
        if (defined(schema.minimum)) {
            check.atLeast(schema.minimum);
        }
        if (defined(schema.maximum)) {
            check.atMost(schema.maximum);
        }
        if (typeof schema.exclusiveMinimum === 'number') {
            check.greaterThan(schema.exclusiveMinimum);
        }
        if (typeof schema.exclusiveMaximum === 'number') {
            check.lessThan(schema.exclusiveMaximum);
        }
        if (defined(schema.multipleOf)) {
            check.isTrue(data => {
                const value = (data as Record<string, unknown>)[key];
                return typeof value === 'number' && Number.isFinite(value / schema.multipleOf!)
                    && Math.abs(Math.round(value / schema.multipleOf!) - (value / schema.multipleOf!)) < 1e-12;
            }, {
                err: `Item ${key} must be a multiple of ${schema.multipleOf}`,
            });
        }
        if (schema.enum) {
            check.isTrue(data => schema.enum!.includes((data as Record<string, unknown>)[key]), {
                err: `Item ${key} must be one of the allowed values`,
            });
        }
        if (defined(schema.const)) {
            check.equals(schema.const, {
                err: `Item ${key} must equal ${JSON.stringify(schema.const)}`,
            });
        }

        if (schema.exclusiveMinimum === true || schema.exclusiveMaximum === true) {
            throw new Error(`Boolean exclusive bounds are not supported at ${this.pathLabel(path)}.`);
        }

        return check;
    }

    private applyBooleanSchema(field: FieldCheck, schema: JsonSchema, _path: string[]): Check {
        const check = field.boolean();
        const key = String(check.result().field);

        if (schema.enum) {
            check.isTrue(data => schema.enum!.includes((data as Record<string, unknown>)[key]), {
                err: `Field ${key} must be one of the allowed values`,
            });
        }
        if (defined(schema.const)) {
            check.equals(schema.const);
        }

        return check;
    }

    private applyBooleanItemSchema(item: ArrayItemCheck, schema: JsonSchema, _path: string[]): Check {
        const check = item.boolean();
        const key = String(check.result().field);

        if (schema.enum) {
            check.isTrue(data => schema.enum!.includes((data as Record<string, unknown>)[key]), {
                err: `Item ${key} must be one of the allowed values`,
            });
        }
        if (defined(schema.const)) {
            check.equals(schema.const, {
                err: `Item ${key} must equal ${JSON.stringify(schema.const)}`,
            });
        }

        return check;
    }

    private createFailureCheck(field: string | number, message: string, options?: CheckOptions): Check {
        const payload = buildErrorMessage(message, options);
        payload.field = field;
        return new StaticCheck(payload);
    }

    private assertSupportedSchema(schema: JsonSchema, path: string[]): void {
        const unsupportedKeys = [
            '$ref',
            '$defs',
            'definitions',
            'patternProperties',
            'propertyNames',
            'if',
            'then',
            'else',
            'contains',
            'prefixItems',
            'dependentRequired',
            'dependentSchemas',
            'unevaluatedProperties',
            'unevaluatedItems',
        ] as const;

        for (const key of unsupportedKeys) {
            if (defined(schema[key])) {
                throw new Error(`Unsupported JSON Schema keyword \"${key}\" at ${this.pathLabel(path)}.`);
            }
        }

        for (const [property, nested] of Object.entries(schema.properties ?? {})) {
            this.assertSupportedSchema(nested, [...path, property]);
        }

        if (schema.items && !Array.isArray(schema.items)) {
            this.assertSupportedSchema(schema.items, [...path, 'items']);
        }

        for (const [index, nested] of (schema.allOf ?? []).entries()) {
            this.assertSupportedSchema(nested, [...path, `allOf[${index}]`]);
        }

        for (const [index, nested] of (schema.anyOf ?? []).entries()) {
            this.assertSupportedSchema(nested, [...path, `anyOf[${index}]`]);
        }

        for (const [index, nested] of (schema.oneOf ?? []).entries()) {
            this.assertSupportedSchema(nested, [...path, `oneOf[${index}]`]);
        }

        if (schema.not) {
            this.assertSupportedSchema(schema.not, [...path, 'not']);
        }
    }

    private hasComposition(schema: JsonSchema): boolean {
        return Boolean(schema.allOf?.length || schema.anyOf?.length || schema.oneOf?.length || schema.not);
    }

    private buildNotMessage(path: string[]): string {
        if (path.length === 0) {
            return 'Input must not match the excluded schema';
        }

        return `${this.pathLabel(path)} must not match the excluded schema`;
    }

    private allowsNull(schema: JsonSchema): boolean {
        if (!defined(schema.type)) {
            return false;
        }

        return Array.isArray(schema.type)
            ? schema.type.includes('null')
            : schema.type === 'null';
    }

    private getPrimaryType(schema: JsonSchema, path: string[]): Exclude<JsonSchemaTypeName, 'null'> | 'null' | undefined {
        if (schema.type === undefined) {
            if (schema.properties || schema.required) {
                return 'object';
            }
            if (schema.items || defined(schema.minItems) || defined(schema.maxItems)) {
                return 'array';
            }
            return undefined;
        }

        if (!Array.isArray(schema.type)) {
            return schema.type;
        }

        const nonNull = schema.type.filter(type => type !== 'null');
        if (nonNull.length === 0) {
            return 'null';
        }
        if (nonNull.length > 1) {
            throw new Error(`Union types are not supported at ${this.pathLabel(path)}.`);
        }

        return nonNull[0];
    }

    private isRootObjectSchema(schema: JsonSchema): boolean {
        const type = this.getPrimaryType(schema, []);
        return type === 'object';
    }

    private isPlainObject(value: unknown): value is Record<string, unknown> {
        return defined(value) && typeof value === 'object' && !Array.isArray(value);
    }

    private getObjectCheckValue(check: ObjectCheck): unknown {
        return (check as unknown as { data?: unknown }).data;
    }

    private getArrayCheckValue(check: ArrayCheck): unknown {
        return (check as unknown as { data?: unknown }).data;
    }

    private getFieldValue(field: FieldCheck): unknown {
        const target = field as unknown as { data?: Record<string | number, unknown>, key?: string | number };
        return defined(target.data) && defined(target.key) ? target.data[target.key] : undefined;
    }

    private getArrayItemValue(item: ArrayItemCheck): unknown {
        return (item as unknown as { item?: unknown }).item;
    }

    private ensureStringEnum(values: unknown[], path: string[]): asserts values is string[] {
        if (!values.every(value => typeof value === 'string')) {
            throw new Error(`String enum values must all be strings at ${this.pathLabel(path)}.`);
        }
    }

    private pathLabel(path: string[]): string {
        return path.length > 0 ? path.join('.') : '<root>';
    }
}