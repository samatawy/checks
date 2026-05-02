import { BooleanExpression, DateExpression, Expression, NumericExpression, StringExpression } from "./syntax/expression";
import { BooleanFunctionExpression, DateFunctionExpression, FunctionExpression, NumericFunctionExpression, StringFunctionExpression } from "./syntax/function.expression";
import { CustomFunctionExpression } from "./syntax/functions/custom.function";
import { LambdaExpression } from "./syntax/lambda.expression";
import { LiteralExpression } from "./syntax/literal.expression";
import { TernaryExpression } from "./syntax/ternary.expression";
import { VariableExpression } from "./syntax/variable.expression";
import type { ArrayType, AtomicType, ComplexType, ObjectArrayType, ObjectType, PropertyType, RootType, TypeChecker, ValidationResult } from "./types";

/**
 * Check if a given key exists in the context, supporting nested keys using dot notation (e.g., "person.name.first").
 * TODO: Support arrays in the path (e.g., "person.children.name").
 * 
 * @param context the context object to check for the key.
 * @param key the key to check for existence, which can be a simple key or a nested key using dot notation.
 * @returns true if the key exists in the context, false otherwise.
 */
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

/**
 * Read a value from the context using a key that can be a nested path with dot notation.
 * TODO: Support arrays in the path (e.g., "person.children.name").
 * 
 * @param context the context object to read the value from.
 * @param key the key to read the value for, which can be a simple key or a nested key using dot notation.
 * @returns the value associated with the key, or undefined if the key is not found.
 */
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
            } else if (currentContext && Array.isArray(currentContext)) {
                // follow all items in the array and check if the key exists in any of the items, if so we return an array of the values at that key for each item
                const items = currentContext.map(item => getPathValue(item, k));

                currentContext = items.filter(item => item !== undefined);

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

/**
 * Determine the return type of an expression.
 * 
 * @param expression the expression to evaluate.
 * @param checker an optional type checker to use for variable expressions.
 * @returns the return type of the expression, or undefined if it cannot be determined.
 */
export function getReturnType(expression: Expression, checker?: TypeChecker): AtomicType | ArrayType | ObjectType | ObjectArrayType | undefined {
    if (expression instanceof LiteralExpression) {
        const value = expression.evaluate();
        const type = typeof value;
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return type as AtomicType;
        } else if (value instanceof Date) {
            return 'date';
        }
    }
    else if (expression instanceof VariableExpression) {
        if (checker) {
            return checker.getType(expression.getVariableName()) as AtomicType | ArrayType | ObjectType | ObjectArrayType | undefined;
        } else return undefined;

    } else if (expression instanceof FunctionExpression || expression instanceof CustomFunctionExpression) {
        return expression.returnsType(checker);
    } else if (expression instanceof LambdaExpression) {
        return (expression as LambdaExpression).returnsType(checker) as AtomicType | ObjectType | undefined;
    } else if (expression instanceof TernaryExpression) {
        return (expression as TernaryExpression).returnsType(checker) as AtomicType | ObjectType | undefined;

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

/**
 * Check if a given key exists in a type definition, supporting nested keys using dot notation (e.g., "person.name.first").
 * TODO: Support arrays in the path (e.g., "person.children.name").
 * 
 * @param type the type definition to check.
 * @param key the key to check for, which can be a simple key or a nested key using dot notation.
 * @returns true if the key exists in the type definition, false otherwise.
 */
export function hasDefinedType(type: RootType | PropertyType | any, key?: string): boolean {
    // return type of the root if no key is provided
    if (!key) {
        return type.type || {} as ObjectType;
    }

    // for simple keys, check if the type defines the required key in its properties
    if (!key.includes('.')) {
        if (type.properties) {
            const property = type.properties[key];
            return property !== undefined;
        } else if (type.items) {
            const item = type.items[key];
            return item !== undefined;
        } else {
            return false;
        }
    }

    // otherwise handle nested keys by splitting the key and traversing the type structure accordingly
    const path = key.split('.');
    const firstSegment = path[0]!;
    const remainingPath = path.slice(1).join('.');
    // console.debug(`Checking for defined type for key segment ${firstSegment} in type`, type);
    if (type.properties) {
        const propertyType = type.properties[firstSegment];
        if (propertyType) {
            // console.debug(`Key segment ${firstSegment} found in type properties:`, type);
            return hasDefinedType(propertyType, remainingPath);
        }
    }
    if (type.items) {
        const itemType = type.items[firstSegment];
        if (itemType) {
            // console.debug(`Key segment ${firstSegment} found in type items:`, type);
            return hasDefinedType(itemType, remainingPath);
        }
    }
    console.debug(`Key segment ${firstSegment} not found in type properties or items:`, type);
    return false;
}

/**
 * Get the defined type for a given key in a type definition, supporting nested keys using dot notation (e.g., "person.name.first").
 * TODO: Support arrays in the path (e.g., "person.children.name").
 * 
 * @param type the type definition to check.
 * @param key the key to get the type for, which can be a simple key or a nested key using dot notation.
 * @param array_path a flag indicating if the current path is within an array.
 * @returns the type associated with the key, or undefined if the key is not found.
 */
export function getDefinedType(type: RootType | PropertyType | any, key?: string, array_path?: boolean): AtomicType | ArrayType | ObjectArrayType | ComplexType | undefined {
    if (!key) {
        return type.type || {} as ObjectType;
    }
    // array_path = array_path || type.type === 'array' || !!type.items;
    // console.debug('Traversing type', type, 'key', key, 'array_path', array_path);

    if (!key.includes('.')) {
        if (type.properties) {
            const property = type.properties[key];
            if (property) {
                if (array_path) {
                    const explicitType = property.type || property as AtomicType | ArrayType;
                    // console.debug(`Handling array in path for property ${key}: original type ${explicitType}, array_path=${array_path}`);
                    if (explicitType === 'array' && (property as ObjectArrayType).items) {
                        return property as ObjectArrayType;
                    } else if (isArrayType(explicitType)) {
                        return explicitType;
                    } else if (isAtomicType(explicitType)) {
                        // console.debug(`Converting atomic type to array type for property ${key}: original type ${explicitType}, ${explicitType + '[]' as ArrayType}`);
                        return explicitType + '[]' as ArrayType;
                    } else {
                        return 'array';
                    }
                } else {
                    if (property.type === 'array' && (property as ObjectArrayType).items) {
                        return property as ObjectArrayType;
                    } else {
                        return property.type || property as AtomicType | ArrayType;
                    }
                }
            }
        }
        if (type.items) {       // This is an array of objects, so we need to check the item type
            array_path = true;
            const itemType = type.items[key];
            if (itemType) {
                const explicitType = itemType.type || itemType as AtomicType | ArrayType | ObjectArrayType;
                // console.debug(`Handling array in last step for item ${key}: original type ${explicitType}, array_path=${array_path}`);
                if (explicitType === 'array' && (itemType as ObjectArrayType).items) {
                    return itemType as ObjectArrayType;
                } else if (isArrayType(explicitType)) {
                    return explicitType;
                } else if (isAtomicType(explicitType)) {
                    // console.debug(`Converting atomic type to array type for property ${key}: original type ${explicitType}, ${explicitType + '[]' as ArrayType}`);
                    return explicitType + '[]' as ArrayType;
                } else {
                    return 'array';
                }
            }
        }
        console.debug(`Property ${key} not found in type properties:`, type.properties);
        return undefined;
    }

    const path = key.split('.');
    const firstSegment = path[0]!;
    const remainingPath = path.slice(1).join('.');
    // console.debug(`Traversing type for segment ${firstSegment}: type=${type}, remainingPath=${remainingPath}, array_path=${array_path}`);

    if (type.properties) {
        const propertyType = type.properties[firstSegment];
        if (propertyType) {
            // console.debug(`Found property ${firstSegment} in type properties: ${propertyType}, remainingPath=${remainingPath}, array_path=${array_path}`);
            return getDefinedType(propertyType, remainingPath, array_path);
        }
    }
    if (type.items) {
        const itemType = type.items[firstSegment];
        if (itemType) {
            array_path = true;
            // console.debug(`Setting array path for segment ${firstSegment}: itemType=${itemType}, remainingPath=${remainingPath}, array_path=${array_path}`);
            return getDefinedType(itemType, remainingPath, array_path);
        }
    }
    return undefined;
}

/**
 * Merge multiple validation results into a single result, combining the validity and aggregating any error messages.
 * 
 * @param results the validation results to merge.
 * @returns a single validation result representing the merged outcome.
 */
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

/**
 * Check if a given type is an atomic type (string, number, boolean, or date).
 * 
 * @param type the type to check.
 * @returns true if the type is an atomic type, false otherwise.
 */
export function isAtomicType(type: PropertyType | unknown): type is AtomicType {
    return type === 'string' || type === 'number' || type === 'boolean' || type === 'date';
}

/**
 * Check if a given type is an array type (array, string[], number[], boolean[], or date[]).
 * 
 * @param type the type to check.
 * @returns true if the type is an array type, false otherwise.
 */
export function isArrayType(type: PropertyType | unknown): type is ArrayType {
    if ((type as ObjectArrayType)?.items !== undefined) {
        return true;
    }
    return type === 'array' || type === 'string[]' || type === 'number[]' || type === 'boolean[]' || type === 'date[]';
}

export function makeArrayType(type: AtomicType | ObjectType | unknown): ArrayType | ObjectArrayType {
    if (isAtomicType(type)) {
        return type + '[]' as ArrayType;
    } else if ((type as ObjectType).items) {
        return { type: 'array', items: type } as ObjectArrayType;
    } else {
        return 'array';
    }
}

export function makeItemType(type: ArrayType | ObjectArrayType | unknown): AtomicType | ObjectType {
    if ((type as ObjectArrayType).items) {
        return (type as ObjectArrayType).items;
    } else if (isArrayType(type)) {
        const itemType = type.replace('[]', '') as AtomicType;
        if (isAtomicType(itemType)) {
            return itemType;
        }
    }
    throw new Error(`Unable to determine item type for array type: ${type}`);
}

export function getLiteralType(value: any): AtomicType | ArrayType {
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean') {
        return type as AtomicType;
    } else if (value instanceof Date) {
        return 'date';
    } else if (Array.isArray(value)) {
        if (value.length === 0) {
            return 'array';
        }
        const itemType = getLiteralType(value[0]);
        if (isAtomicType(itemType)) {
            return itemType + '[]' as ArrayType;
        } else {
            return 'array';
        }
    }
    throw new Error(`Unsupported literal type: ${type}`);
}

// export function isComplexType(type: PropertyType | ComplexType): type is ComplexType {
//     return type === 'object' || type === 'array';
// }
