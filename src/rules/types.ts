import type { Expression } from "./syntax/expression";

export interface WorkingContext {

    /**
     * Read data from the context using the given key or path. 
     * Nested keys can be accessed using dot notation (e.g., "user.name").
     * @param key the key to look up in the context.
     * @returns the value associated with the key, or undefined if the key is not found.
     */
    getData(key: string): any;

    /**
     * Check if the context contains data for the given key or path.
     * Nested keys can be accessed using dot notation (e.g., "user.name").
     * @param key the key to check in the context.
     * @returns true if the key exists in the context, false otherwise.
     */
    hasData(key: string): boolean;

    /**
     * Get a constant value from the context using the given key.
     * Nested keys are not allowed.
     * @param key the key to look up in the constants.
     * @returns the constant value associated with the key, or undefined if the key is not found.
     */
    getConstant(key: string): any;

    /**
     * Check if the context contains a constant for the given key.
     * Nested keys are not allowed.
     * @param key the key to check in the constants.
     * @returns true if the constant exists, false otherwise.
     */
    hasConstant(key: string): boolean;

    /**
     * Get the root-level keys of the context.
     * This can be useful for determining what data is available in the context and for debugging purposes.
     * @returns an array of root-level keys in the context.
     */
    rootKeys(): string[];

    /**
     * Add an exception to the context with a message and additional context information.
     * @param message the message describing the exception.
     * @param context additional context information related to the exception.
     */
    addException(message: string, context: any): void;

    /**
     * Set an output value in the context with the given key.
     * @param key the key to associate with the output value.
     * @param value the value to set for the given key.
     */
    setOutput(key: string, value: any): void;

    /**
     * Get an output value from the context using the given key.
     * @param key the key to look up in the outputs.
     * @returns the output value associated with the key, or undefined if the key is not found.
     */
    getOutput(key?: string): any;
}

export interface RuleEffect {

    /**
     * Indicates whether the rule was satisfied when evaluated. 
     * This can be used by the rule engine to determine if the rule should be executed or not.
     */
    satisfied?: boolean;

    /**
     * Indicates which data key was changed as a result of executing the rule. 
     * This can be used by the rule engine to track changes and manage dependencies between rules.
     */
    changed?: string;

    /**
     * Indicates an exception that was thrown during the execution of the rule. 
     * This can be used by the rule engine to handle errors and take appropriate actions.
     */
    exception?: string;
}

export interface Evaluator {

    /**
     * Evaluate the rule or expression in the given context.
     * Implementations differ in what they perform and return.
     * @param context the current working context containing data and constants.
     * @returns an executor to execute, or the value of the expression based on the context.
     */
    evaluate(context: WorkingContext): Executor | any | null;
}

export interface Executor {

    // /**
    //  * Get the data keys that this executor will change when executed.
    //  * @returns a set of data keys that will be changed when this executor is executed.
    //  */
    changes(): Set<string>;

    /**
     * Execute the required action in the given context and return the effects of the execution.
     * @param context the current working context containing data and constants.
     * @returns the effects of executing the action, including any changes or exceptions.
     */
    execute(context: WorkingContext): RuleEffect;
}

export interface ValidationResult {

    valid: boolean;

    errors?: string[];
}

export interface TypeChecker {
    /**
     * Check if the type checker knows the type of the given key.
     * Nested keys can be checked using dot notation (e.g., "user.name").
     * @param key the key to check.
     * @returns true if the type is known, false otherwise.
     */
    hasType(key: string): boolean;

    /**
     * Get the type of the given key from the type checker.
     * Nested keys can be accessed using dot notation (e.g., "user.name").
     * @param key the key to look up in the type checker.
     * @returns the type associated with the key, or undefined if the type is not known.
     */
    getType(key: string): PropertyType | undefined;

    /**
     * Perform type checking on the given target, which can be a rule, expression, or any other component 
     * that requires type validation.
     * @param target the target to check types for, which must implement the HasValidity interface.
     * @returns the result of the type check, indicating whether the target is valid and any errors if it is not.
     */
    checkTypes(target: HasValidity): ValidationResult;

    /**
     * Indicates whether the type checker should enforce strict input validation. 
     * When true, the type checker will validate that all required input data for rules and expressions 
     * are defined and conform to expected types, potentially throwing errors if inputs are missing or incorrectly typed. 
     */
    strictInputs(): boolean;

    /**
     * Indicates whether the type checker should enforce strict output validation. 
     * When true, the type checker will validate that all output data for rules and expressions 
     * are defined and conform to expected types, potentially throwing errors if outputs are missing or incorrectly typed.
     */
    strictOutputs(): boolean;
}

export interface HasValidity {
    checkTypes(checker?: TypeChecker): ValidationResult;
}

export type AtomicType = 'string' | 'number' | 'boolean' | 'date';

export type ComplexType = 'object' | 'array';

export type PropertyType = AtomicType | ComplexType | Record<string, ObjectType>;

export interface ObjectType {
    [key: string]: PropertyType;
}

/** A defined root type that can contain nested properties*/
export interface RootType {
    /**
     * The key that identifies this root type. This is the top-level identifier for the type and can be used to reference it in rules and expressions.
     */
    key: string;

    /**
     * The atomic type of the root type, if applicable. Needed only for root types that are not objects.
     */
    type?: AtomicType;

    /**
     * The properties of the root type, if it is an object. This allows for nested structures and detailed type definitions.
     */
    properties?: Record<string, PropertyType>;
}

export interface TypedParameter {
    type: AtomicType;
    optional?: boolean;
}

export interface NamedParameter extends TypedParameter {
    name: string;
}

export interface FunctionDefinition {
    name: string;
    parameters: NamedParameter[];
    expression: Expression;
}
