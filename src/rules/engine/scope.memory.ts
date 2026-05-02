import type { ArrayType, AtomicType, ObjectArrayType, ObjectType, TypeChecker, ValidationResult, WorkingContext } from "../types";
import { getPathValue, pathExists } from "../utils";

export class ScopeContext implements WorkingContext {

    private parent: WorkingContext | null;

    private variables: Record<string, any>;

    constructor(parent: WorkingContext | null = null) {
        this.parent = parent;
        this.variables = {};
    }

    setData(key: string, value: any): void {
        this.variables[key] = value;
    }

    getData(key: string): any {
        const value = getPathValue(this.variables, key);
        if (value !== undefined) {
            return value;
        } else if (this.parent) {
            return this.parent.getData(key);
        } else {
            // console.debug(`Undefined variable access: ${key} in function context. Current variables:`, this.variables);
            throw new Error(`Undefined variable: ${key}`);
        }
    }

    hasData(key: string): boolean {
        if (key in this.variables) {
            return true;
        } else if (this.parent) {
            return this.parent.hasData(key);
        } else {
            return false;
        }
    }

    getConstant(key: string): any {
        return this.parent ? this.parent.getConstant(key) : this.getData(key);
    }

    hasConstant(key: string): boolean {
        return this.parent ? this.parent.hasConstant(key) : this.hasData(key);
    }

    rootKeys(): string[] {
        const keys = new Set<string>(Object.keys(this.variables));
        if (this.parent) {
            for (const key of this.parent.rootKeys()) {
                keys.add(key);
            }
        }
        return Array.from(keys);
    }

    addException(message: string, context: any): void {
        // For simplicity, we just throw an error here. In a real implementation, you might want to collect exceptions instead.
        throw new Error(`Function exception: ${message}. Context: ${JSON.stringify(context)}`);
    }

    setOutput(key: string, value: any): void {
        this.variables[key] = value;
    }

    getOutput(key?: string): any {
        if (key) {
            return this.getData(key);
        } else {
            return { ...this.variables };
        }
    }
}

export class ScopeTypeChecker implements TypeChecker {

    private parent: TypeChecker | null;

    private types: Record<string, AtomicType | ArrayType | ObjectType>;

    constructor(parent: TypeChecker | null = null) {
        this.parent = parent;
        this.types = {};
    }

    setType(key: string, type: AtomicType | ArrayType | ObjectType): void {
        this.types[key] = type;
    }

    hasType(key: string): boolean {
        const found = pathExists(this.types, key);
        if (found) {
            return true;
        } else if (this.parent) {
            return this.parent.hasType(key);
        } else {
            return false;
        }
    }

    getType(key: string): AtomicType | ArrayType | ObjectArrayType | ObjectType | undefined {
        const found = getPathValue(this.types, key);
        if (found) {
            return found;
        } else if (this.parent) {
            return this.parent.getType(key) as AtomicType | ArrayType | ObjectArrayType | ObjectType | undefined;
        } else {
            return undefined;
        }
    }

    checkTypes(target: any): ValidationResult {
        return { valid: true };
    }

    strictSyntax(): boolean {
        return this.parent ? this.parent.strictSyntax() : true;
    }

    strictInputs(): boolean {
        return this.parent ? this.parent.strictInputs() : true;
    }

    strictOutputs(): boolean {
        return this.parent ? this.parent.strictOutputs() : true;
    }
}