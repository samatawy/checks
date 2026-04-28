import type { AtomicType, PropertyType, RootType, ValidationResult, TypeChecker, ComplexType } from "../types";
import type { WorkSpaceOptions } from "./work.space";
import { getDefinedType, hasDefinedType } from "../utils";
import type { AbstractRule } from "../rules/abstract.rule";

export class TypeMemory implements TypeChecker {

    private types: Map<string, RootType>;

    protected options: WorkSpaceOptions;

    constructor(options?: Partial<WorkSpaceOptions>) {
        this.types = new Map<string, RootType>();

        this.options = {
            debugging: false,
            strict_conflicts: false,    // Ignored here
            strict_inputs: false,
            strict_outputs: false,   // Ignored here
            max_iterations: 100,      // Ignored here
            ...options
        };
    }

    public strictInputs(): boolean {
        return this.options.strict_inputs;
    }

    public strictOutputs(): boolean {
        return this.options.strict_outputs;
    }

    public hasRootType(key: string): boolean {
        if (key.includes('.')) {
            key = key.split('.')[0] || '';
        }
        return this.types.has(key);
    }

    public getRootType(key: string): RootType | undefined {
        if (key.includes('.')) {
            key = key.split('.')[0] || '';
        }
        return this.types.get(key);
    }

    public addRootType(type: RootType): void {
        this.types.set(type.key, type);
    }

    public addRootTypes(types: Map<string, RootType> | Record<string, RootType> | RootType[]): void {
        if (types instanceof Map) {
            for (const type of types.values()) {
                this.addRootType(type);
            }
        } else if (Array.isArray(types)) {
            for (const type of types) {
                this.addRootType(type);
            }
        } else {
            for (const type of Object.values(types)) {
                this.addRootType(type);
            }
        }
    }

    public clear(): void {
        this.types.clear();
    }

    public hasType(key: string): boolean {
        const root = this.getRootType(key);
        if (key.includes('.')) {
            const remainingKey = key.split('.').slice(1).join('.');
            return root ? hasDefinedType(root, remainingKey) : false;
        } else {
            return root !== undefined;
        }
    }

    public getType(key: string): AtomicType | ComplexType | undefined {
        const root = this.getRootType(key);
        if (key.includes('.')) {
            const remainingKey = key.split('.').slice(1).join('.');
            return root ? getDefinedType(root, remainingKey) : undefined;
        } else {
            return root ? root.type || 'object' : undefined;
        }
    }

    public checkTypes(rule: AbstractRule): ValidationResult {
        if (!this.options.strict_inputs && !this.options.strict_outputs) {
            return { valid: true };
        }

        return rule.checkTypes(this);
    }

    public validateData(input: any): ValidationResult {
        if (!this.options.strict_inputs) {
            return { valid: true };
        }

        this.debug(`Validating input: ${JSON.stringify(input)} against type definitions.`, this.types);
        let errors: string[] = [];

        for (const [rootKey, type] of Object.entries(input)) {
            if (this.types.has(rootKey)) {
                this.debug(`Validating key: ${rootKey} with value: ${input[rootKey]} against type definition.`);

                const expectedType = this.types.get(rootKey);
                if (expectedType) {
                    const result = this.validateType(rootKey, type, expectedType);
                    if (!result.valid) {
                        // One of the properties did not match the expected type
                        errors.push(...(result.errors || []));
                        // return { valid: false, errors: result.errors };
                    }
                }
            } else {
                // No type definition found for this key, skipping validation
                this.debug(`No type definition found for key: ${rootKey}.`);
                errors.push(`No type definition found for key: ${rootKey}.`);
            }
        }
        // All properties matched the expected types
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    protected validateType(key: string, value: any, expectedType: RootType | PropertyType | any): ValidationResult {
        this.debug(`Validating value: ${value} against expected type: ${JSON.stringify(expectedType)}.`);
        const expected: any = expectedType as any;
        let errors: string[] = [];

        if (expectedType === 'string' || expectedType === 'number' || expectedType === 'boolean') {
            // A leaf node with an atomic type
            const actualType = typeof value;
            this.debug(`Actual type: ${actualType}, Expected Atomic type: ${expectedType}.`);
            if (actualType === expectedType) {
                return { valid: true };
            } else {
                return { valid: false, errors: [`${key} has value ${value} of type ${actualType}, expected ${expectedType}.`] };
            }
        }
        else if (expected.hasOwnProperty('type') && expected.type !== 'object' && expected.type !== 'array') {
            // A leaf node with an atomic type defined in a RootType
            const actualType = typeof value;
            this.debug(`Actual type: ${actualType}, Expected Property type: ${expected.type}.`);
            if (actualType === expected.type) {
                return { valid: true };
            } else {
                return { valid: false, errors: [`${key} has value ${value} of type ${actualType}, expected ${expected.type}.`] };
            }
        }
        else if (expected.hasOwnProperty('properties')) {
            // An object type with nested properties
            for (const [key, propertyType] of Object.entries(expected.properties!)) {
                this.debug(`Validating property: ${key} with value: ${value[key]} against property type definition.`);
                const result = this.validateType(key, value[key], propertyType);
                if (!result.valid) {
                    // One of the properties did not match the expected type
                    errors.push(...(result.errors || []));
                }
            }
            // All properties matched the expected types
            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
            };

        } else {
            throw new Error(`Unsupported type definition: ${JSON.stringify(expectedType)}.`);
        }
    }

    private debug(...args: any[]): void {
        if (this.options.debugging) {
            console.debug('[TypeMemory DEBUG]', ...args);
        }
    }
}