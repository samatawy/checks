import { BooleanExpression, DateExpression, Expression, NumericExpression, StringExpression } from "./syntax/expression";
import { BooleanFunctionExpression, DateFunctionExpression, FunctionExpression, NumericFunctionExpression, StringFunctionExpression } from "./syntax/function.expression";
import { LiteralExpression } from "./syntax/literal.expression";
import { VariableExpression } from "./syntax/variable.expression";
import type { AtomicType, ComplexType, PropertyType, RootType, TypeChecker, ValidationResult } from "./types";

export function pathExists(context: any, key: string): boolean {
    if (context == null || typeof context !== 'object') {
        return false;
    }

    if (key.includes('.')) {
        const keys = key.split('.');
        let currentContext = context;
        for (const k of keys) {
            if (currentContext && typeof currentContext === 'object' && k in currentContext) {
                currentContext = currentContext[k];
            } else {
                return false;
            }
        }
        return true;
    } else {
        return key in context;
    }
}

export function getPathValue(context: any, key: string): any {
    if (context == null || typeof context !== 'object') {
        return undefined;
    }

    if (key.includes('.')) {
        const keys = key.split('.');
        let currentContext = context;
        for (const k of keys) {
            if (currentContext && typeof currentContext === 'object' && k in currentContext) {
                currentContext = currentContext[k];
            } else {
                return undefined;
            }
        }
        return currentContext;
    } else {
        return context[key];
    }
}

export function cloneDeep(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => cloneDeep(item));
    }

    const clonedObj: any = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = cloneDeep(obj[key]);
        }
    }
    return clonedObj;
}

export function getReturnType(expression: Expression, checker?: TypeChecker): AtomicType | undefined {
    if (expression instanceof LiteralExpression) {
        const value = expression.evaluate();
        const type = typeof value;
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return type as AtomicType;
        } else if (value instanceof Date) {
            return 'date';
            // } else if (Array.isArray(value)) {
            //     return 'array';
            // } else if (type === 'object') {
            //     return 'object';
        }
    }
    else if (expression instanceof VariableExpression) {
        if (checker) {
            return checker.getType(expression.getVariableName()) as AtomicType | undefined;
        } else return undefined;
    } else if (expression instanceof FunctionExpression) {
        if (expression instanceof StringFunctionExpression) {
            return 'string';
        } else if (expression instanceof NumericFunctionExpression) {
            return 'number';
        } else if (expression instanceof BooleanFunctionExpression) {
            return 'boolean';
        } else if (expression instanceof DateFunctionExpression) {
            return 'date';
        }

    } else if (expression instanceof StringExpression) {
        return 'string';
    } else if (expression instanceof NumericExpression) {
        return 'number';
    } else if (expression instanceof BooleanExpression) {
        return 'boolean';
    } else if (expression instanceof DateExpression) {
        return 'date';
    }

    console.debug(`Unable to determine return type for expression: ${expression}`);
    // For other expression types, we would need to implement logic to determine the return type based on the expression structure and the types of its components.
    return undefined;
}

export function hasDefinedType(type: RootType | PropertyType | any, key?: string): boolean {
    // return type of the root if no key is provided
    if (!key) {
        return type.type || 'object';
    }

    // for simple keys, check if the type defines the required key in its properties
    if (!key.includes('.')) {
        if (type.properties) {
            const property = type.properties[key];
            return property !== undefined;
        } else {
            return false;
        }
    }

    // otherwise handle nested keys by splitting the key and traversing the type structure accordingly
    const path = key.split('.');
    const firstSegment = path[0]!;
    const remainingPath = path.slice(1).join('.');
    if (type.properties) {
        const propertyType = type.properties[firstSegment];
        if (propertyType) {
            return hasDefinedType(propertyType, remainingPath);
        }
    }
    return false;
}

export function getDefinedType(type: RootType | PropertyType | any, key?: string): AtomicType | undefined {
    if (!key) {
        return type.type || 'object';
    }

    if (!key.includes('.')) {
        if (type.properties) {
            const property = type.properties[key];
            if (property) {
                return property.type || property as AtomicType;
            }
        }
        return undefined;
    }

    const path = key.split('.');
    const firstSegment = path[0]!;
    const remainingPath = path.slice(1).join('.');
    if (type.properties) {
        const propertyType = type.properties[firstSegment];
        if (propertyType) {
            return getDefinedType(propertyType, remainingPath);
        }
    }
    return undefined;
}

export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
    const merged: ValidationResult = { valid: true };
    for (const result of results) {
        merged.valid = merged.valid && result.valid;
        if (result.errors) {
            merged.errors = merged.errors ? [...merged.errors, ...result.errors] : [...result.errors];
        }
    }
    return merged;
}

export function isAtomicType(type: PropertyType): type is AtomicType {
    return type === 'string' || type === 'number' || type === 'boolean' || type === 'date';
}

export function isComplexType(type: PropertyType): type is ComplexType {
    return type === 'object' || type === 'array';
}
